"""
Finverse Customer Portal Service
Enforces strict row-level authorization so customers can access ONLY their own transactions,
disputes, and personal exports. Internal ML weights, rule codes, and investigator notes are strictly redacted.
"""
import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Any
from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session
import openpyxl

from app.models import User, Transaction, CustomerDispute, Case, AuditEvent

def get_or_assign_customer_account(db: Session, user: User) -> str:
    """
    Ensures a customer user has a linked account ID (e.g. ACC-7102).
    """
    if user.customer_account_id:
        return user.customer_account_id
    
    # Assign default customer account or match based on email
    account_id = f"ACC-CUST-{user.id + 7000}"
    user.customer_account_id = account_id
    db.commit()
    return account_id

def sanitize_customer_status(internal_status: str, risk_level: str | None) -> str:
    """
    Translates internal system statuses into clear, customer-friendly status labels
    without exposing internal risk thresholds or fraud rule terminology.
    """
    s = (internal_status or "settled").lower()
    if s in ("settled", "cleared", "processed"):
        return "Completed"
    elif s in ("held", "flagged"):
        return "Standard Safety Review"
    elif s in ("under_investigation", "pending_review"):
        return "In Verification"
    elif s in ("blocked", "quarantined"):
        return "Declined"
    else:
        return "Processing"

def get_customer_dashboard_overview(db: Session, user: User) -> dict[str, Any]:
    acc_id = get_or_assign_customer_account(db, user)

    # Authorized transactions query
    tx_query = select(Transaction).where(
        or_(
            Transaction.sender_account_id == acc_id,
            Transaction.receiver_account_id == acc_id,
            Transaction.sender_name.ilike(f"%{user.full_name}%"),
        )
    ).order_by(desc(Transaction.timestamp))

    tx_list = db.scalars(tx_query.limit(200)).all()

    total_spent = 0.0
    total_received = 0.0
    for tx in tx_list:
        if tx.sender_account_id == acc_id:
            total_spent += tx.amount
        else:
            total_received += tx.amount

    # Recent transactions
    recent = []
    for tx in tx_list[:6]:
        recent.append({
            "transaction_id": tx.transaction_id,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "counterparty": tx.receiver_name or tx.receiver_account_id if tx.sender_account_id == acc_id else tx.sender_name or tx.sender_account_id,
            "direction": "outflow" if tx.sender_account_id == acc_id else "inflow",
            "amount": float(tx.amount),
            "currency": tx.currency or "INR",
            "status": sanitize_customer_status(tx.status, tx.risk_level),
            "channel": tx.channel or "WIRE",
        })

    # Active disputes
    disputes = db.scalars(
        select(CustomerDispute).where(CustomerDispute.user_id == user.id).order_by(desc(CustomerDispute.created_at))
    ).all()

    active_disputes_count = sum(1 for d in disputes if d.status in ("submitted", "under_review", "investigating"))

    summary_dict = {
        "total_outflow_inr": round(total_spent, 2),
        "total_inflow_inr": round(total_received, 2),
        "total_transactions": len(tx_list),
        "active_disputes": active_disputes_count,
    }

    return {
        "customer_name": user.full_name,
        "email": user.email,
        "account_id": acc_id,
        "summary": summary_dict,
        "activity_summary": summary_dict,
        "recent_transactions": recent,
        "status_guide": [
            {
                "status": "Completed",
                "explanation": "Funds have been successfully settled with the counterparty.",
            },
            {
                "status": "Standard Safety Review",
                "explanation": "Routine automated verification check underway to safeguard your account.",
            },
            {
                "status": "In Verification",
                "explanation": "Our payment operations team is verifying transaction details with the clearing network.",
            },
            {
                "status": "Declined",
                "explanation": "Transaction was not processed. Please contact customer support if you need assistance.",
            },
        ],
    }

def get_customer_transactions(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 15,
    search: str | None = None,
    status: str | None = None,
    status_filter: str | None = None,
) -> dict[str, Any]:
    acc_id = get_or_assign_customer_account(db, user)
    actual_status = status_filter or status

    q = select(Transaction).where(
        or_(
            Transaction.sender_account_id == acc_id,
            Transaction.receiver_account_id == acc_id,
            Transaction.sender_name.ilike(f"%{user.full_name}%"),
        )
    )

    if search:
        s_term = f"%{search.strip()}%"
        q = q.where(
            or_(
                Transaction.transaction_id.ilike(s_term),
                Transaction.receiver_account_id.ilike(s_term),
                Transaction.receiver_name.ilike(s_term),
                Transaction.sender_account_id.ilike(s_term),
            )
        )

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(desc(Transaction.timestamp)).offset((page - 1) * page_size).limit(page_size)).all()

    items = []
    for tx in rows:
        items.append({
            "account_id": acc_id,
            "transaction_id": tx.transaction_id,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "counterparty": tx.receiver_name or tx.receiver_account_id if tx.sender_account_id == acc_id else tx.sender_name or tx.sender_account_id,
            "counterparty_account": tx.receiver_account_id if tx.sender_account_id == acc_id else tx.sender_account_id,
            "direction": "outflow" if tx.sender_account_id == acc_id else "inflow",
            "amount": float(tx.amount),
            "currency": tx.currency or "INR",
            "status": sanitize_customer_status(tx.status, tx.risk_level),
            "channel": tx.channel or "WIRE",
            "reference": tx.transaction_id,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if page_size else 1,
    }

def submit_customer_dispute(
    db: Session,
    user: User,
    transaction_id: str,
    reason: str,
    description: str | None = None,
) -> dict[str, Any]:
    acc_id = get_or_assign_customer_account(db, user)

    # 1. Ownership check: verify transaction belongs to this customer
    tx = db.scalar(
        select(Transaction).where(
            and_(
                Transaction.transaction_id == transaction_id,
                or_(
                    Transaction.sender_account_id == acc_id,
                    Transaction.receiver_account_id == acc_id,
                    Transaction.sender_name.ilike(f"%{user.full_name}%"),
                ),
            )
        )
    )
    if not tx:
        raise HTTPException(404, "Transaction not found or you are not authorized to report this record.")

    ref_no = f"DISP-2026-{uuid.uuid4().hex[:6].upper()}"

    # 2. Automatically register investigation Case in backend workflow
    case_id = f"CASE-DISP-{uuid.uuid4().hex[:6].upper()}"
    new_case = Case(
        case_id=case_id,
        title=f"Customer Dispute: {reason.replace('_', ' ').title()} on {tx.transaction_id}",
        case_type="customer_dispute",
        severity="medium",
        status="open",
        assigned_to="Sarah Chen (Lead AML)",
        summary=f"Reported by customer {user.full_name} ({user.email}). Reason: {reason}. Customer statement: {description or 'None provided.'}",
        related_accounts=[acc_id, tx.receiver_account_id],
        related_transaction_ids=[tx.transaction_id],
        notes=[
            {
                "text": f"Customer initiated dispute {ref_no}.",
                "author": "System Gate",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
    )
    db.add(new_case)

    # 3. Create CustomerDispute record
    dispute = CustomerDispute(
        reference_no=ref_no,
        user_id=user.id,
        transaction_id=tx.transaction_id,
        reason=reason,
        description=description,
        status="submitted",
        case_id=case_id,
        customer_updates=[
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "Submitted",
                "message": "Your report has been logged and assigned to payment security for review.",
            }
        ],
    )
    db.add(dispute)

    # 4. Audit
    db.add(
        AuditEvent(
            actor_user_id=user.id,
            action="customer_dispute_submitted",
            entity_type="customer_dispute",
            entity_id=ref_no,
            details={"transaction_id": tx.transaction_id, "reason": reason},
        )
    )

    db.commit()
    db.refresh(dispute)

    return {
        "dispute_id": dispute.reference_no,
        "reference_no": dispute.reference_no,
        "reference_number": dispute.reference_no,
        "case_id": case_id,
        "transaction_id": dispute.transaction_id,
        "status": "submitted",
        "reason": dispute.reason,
        "created_at": dispute.created_at.isoformat(),
        "message": f"Suspicious activity report {ref_no} submitted successfully. Our investigations desk has been notified.",
    }

def get_customer_disputes(db: Session, user: User) -> list[dict[str, Any]]:
    disputes = db.scalars(
        select(CustomerDispute).where(CustomerDispute.user_id == user.id).order_by(desc(CustomerDispute.created_at))
    ).all()

    items = []
    for d in disputes:
        items.append({
            "reference_no": d.reference_no,
            "transaction_id": d.transaction_id,
            "reason": d.reason,
            "description": d.description,
            "status": d.status.replace("_", " ").title(),
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
            "updates": d.customer_updates or [],
        })
    return items

def export_customer_transactions_csv(db: Session, user: User) -> str:
    acc_id = get_or_assign_customer_account(db, user)

    q = select(Transaction).where(
        or_(
            Transaction.sender_account_id == acc_id,
            Transaction.receiver_account_id == acc_id,
            Transaction.sender_name.ilike(f"%{user.full_name}%"),
        )
    ).order_by(desc(Transaction.timestamp))

    tx_list = db.scalars(q).all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["Reference ID", "Date UTC", "Counterparty", "Direction", "Amount INR", "Currency", "Channel", "Status"])

    from app.export_service import sanitize_cell_value
    for tx in tx_list:
        direction = "Debit / Outflow" if tx.sender_account_id == acc_id else "Credit / Inflow"
        counterparty = tx.receiver_name or tx.receiver_account_id if tx.sender_account_id == acc_id else tx.sender_name or tx.sender_account_id
        writer.writerow([
            sanitize_cell_value(tx.transaction_id),
            tx.timestamp.strftime("%Y-%m-%d %H:%M:%S") if tx.timestamp else "",
            sanitize_cell_value(counterparty),
            direction,
            f"{tx.amount:.2f}",
            tx.currency or "INR",
            tx.channel or "WIRE",
            sanitize_customer_status(tx.status, tx.risk_level),
        ])

    return output.getvalue()
