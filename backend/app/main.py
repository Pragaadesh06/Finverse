import asyncio
import secrets
import time
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, or_
from app.config import settings
from app.db import Base, engine, get_db, SessionLocal
from app.models import (
    User,
    AuthChallenge,
    PasswordReset,
    Transaction,
    Case,
    AuditEvent,
    ImportJob,
    ScreeningAssessment,
    CustomerDispute,
    SimulationScenario,
)
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    OTPVerifyRequest,
    ResendOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    CaseCreate,
    CaseUpdate,
    NoteCreate,
    DecisionRequest,
    SimulationRequest,
    ImportConfirmRequest,
    ScreenTransactionRequest,
    OverrideDecisionRequest,
    CustomerDisputeCreate,
    CustomerDisputeNote,
    CounterfactualSimRequest,
    UserRoleUpdateRequest,
    CustomerProfileUpdateRequest,
)
from app.security import (
    hash_password,
    verify_password,
    hash_value,
    create_session_token,
    decode_session_token,
    new_otp,
    new_reset_token,
    send_email,
)
from app.services import (
    seed_if_empty,
    transaction_dict,
    assess_and_store,
    get_network,
    analytics,
    simulation_loop,
)
from app.risk_engine import FraudRiskEngine, screen_and_gate_transaction, ENGINE_VERSION
from app.export_service import generate_report_preview, build_excel_workbook, build_csv_export
from app.import_service import process_import_preview, confirm_import_job, generate_error_report_csv
from app.customer_service import (
    get_customer_dashboard_overview,
    get_customer_transactions,
    submit_customer_dispute,
    get_customer_disputes,
    export_customer_transactions_csv,
    get_or_assign_customer_account,
)
from app.simulator_service import run_counterfactual_simulation


class EventHub:
    def __init__(self):
        self.connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.add(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.discard(ws)

    async def broadcast(self, event):
        dead = []
        for ws in list(self.connections):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db import ensure_schema_compatibility
    ensure_schema_compatibility()
    with SessionLocal() as db:
        seed_if_empty(db)
    app.state.event_hub = EventHub()
    app.state.simulation_running = False
    app.state.simulation_task = None
    yield
    if app.state.simulation_task and not app.state.simulation_task.done():
        app.state.simulation_running = False
        app.state.simulation_task.cancel()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Finverse risk orchestration API",
    lifespan=lifespan,
)

app.state.event_hub = EventHub()
app.state.simulation_running = False
app.state.simulation_task = None

origins = [x.strip() for x in settings.frontend_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def current_user(request: Request, db: Session = Depends(get_db)):
    # Check session cookie or Authorization header
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    uid = decode_session_token(token) if token else None
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Session is invalid")
    return user

def require_roles(*allowed_roles):
    def role_checker(user: User = Depends(current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role in {allowed_roles}, but current role is '{user.role}'."
            )
        return user
    return role_checker

INSTITUTIONAL_ROLES = ("analyst", "senior_analyst", "compliance_officer", "admin")
SUPERVISORY_ROLES = ("senior_analyst", "compliance_officer", "admin")
ADMIN_ROLES = ("admin",)


def audit(db, user_id, action, entity_type, entity_id, details=None):
    db.add(
        AuditEvent(
            actor_user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=details or {},
        )
    )
    db.commit()

def issue_challenge(db, user, purpose):
    code = new_otp()
    challenge = AuthChallenge(
        user_id=user.id,
        purpose=purpose,
        code_hash=hash_value(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_minutes),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    send_email(
        user.email,
        f"Finverse {purpose.replace('_', ' ').title()} code",
        f"Your verification code is {code}. It expires in {settings.otp_ttl_minutes} minutes. If you did not request this, ignore this email.",
    )
    return challenge, code

def check_challenge(db, challenge_id, code, purpose):
    now = datetime.now(timezone.utc)
    ch = None
    if challenge_id:
        ch = db.get(AuthChallenge, challenge_id)
    if not ch:
        # Fallback: look for the most recent active challenge with this purpose and matching code
        candidates = db.scalars(
            select(AuthChallenge)
            .where(
                AuthChallenge.purpose == purpose,
                AuthChallenge.consumed == False,
            )
            .order_by(desc(AuthChallenge.created_at))
            .limit(5)
        ).all()
        for cand in candidates:
            if secrets.compare_digest(cand.code_hash, hash_value(code)):
                ch = cand
                break

    if not ch or ch.purpose != purpose or ch.consumed or ch.attempts >= settings.otp_max_attempts:
        raise HTTPException(400, "Invalid or expired verification challenge")

    expires = ch.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        raise HTTPException(400, "Verification code expired")

    ch.attempts += 1
    if not secrets.compare_digest(ch.code_hash, hash_value(code)):
        db.commit()
        raise HTTPException(400, "Invalid verification code")

    ch.consumed = True
    db.commit()
    return ch

def set_session(response: Response, user: User):
    token = create_session_token(user.id)
    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        max_age=settings.session_ttl_minutes * 60,
        path="/",
    )

def user_payload(user: User):
    initials = "".join([part[0] for part in user.full_name.split() if part][:2]).upper() or "FN"
    colors = ["#2E7D52", "#B8860B", "#1E4D35", "#8C8776"]
    avatar_color = colors[user.id % len(colors)]
    iso_created = user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat()
    return {
        "id": str(user.id),
        "name": user.full_name,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "initials": initials,
        "avatarColor": avatar_color,
        "avatar_color": avatar_color,
        "isEmailVerified": user.is_email_verified,
        "is_email_verified": user.is_email_verified,
        "twoFactorEnabled": user.two_factor_enabled,
        "two_factor_enabled": user.two_factor_enabled,
        "customerAccountId": user.customer_account_id,
        "customer_account_id": user.customer_account_id,
        "organizationId": user.organization_id,
        "organization_id": user.organization_id,
        "createdAt": iso_created,
        "created_at": iso_created,
    }

def case_payload(c: Case):
    notes = [
        {
            "id": f"note-{idx}",
            "author": n.get("author", "Analyst"),
            "timestamp": n.get("created_at", n.get("timestamp", c.created_at.isoformat())),
            "content": n.get("text", n.get("content", "")),
        }
        for idx, n in enumerate(c.notes or [])
    ]
    return {
        "id": c.case_id,
        "case_id": c.case_id,
        "title": c.title,
        "case_type": c.case_type,
        "severity": c.severity,
        "status": c.status,
        "assigned_analyst": c.assigned_to or "Sarah Chen (Lead AML)",
        "assigned_to": c.assigned_to or "Sarah Chen (Lead AML)",
        "related_accounts": c.related_accounts or [],
        "related_transactions": c.related_transaction_ids or [],
        "related_transaction_ids": c.related_transaction_ids or [],
        "summary": c.summary or f"Investigation dossier for {c.title}",
        "trigger_reason": c.trigger_reason,
        "notes": notes,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
    }

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "finverse-api", "environment": settings.environment}

# ── Authentication Routes (supporting both /api/auth and /auth) ───────────────
@app.post("/api/auth/register", status_code=201)
@app.post("/auth/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.lower()
    full_name = body.get_full_name() or email.split("@")[0].title()
    if db.scalar(select(User).where(User.email == email)):
        return {
            "status": "verification_required",
            "success": True,
            "requiresEmailVerification": True,
            "message": "If registration can proceed, verification instructions will be sent.",
        }
    # Security requirement: Public registrations must strictly default to the customer role.
    # Institutional roles can only be granted by an administrator.
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(body.password),
        is_email_verified=False,
        two_factor_enabled=True,
        role="customer",
        customer_account_id=f"ACC-{secrets.randbelow(8999) + 1000}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    challenge, code = issue_challenge(db, user, "verify_email")
    return {
        "status": "verification_required",
        "success": True,
        "requiresEmailVerification": True,
        "challenge_id": challenge.id,
        "message": "Check your email for a verification code.",
    }

@app.post("/api/auth/verify-email")
@app.post("/auth/verify-email")
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    code = body.code or body.token or ""
    ch = check_challenge(db, body.challenge_id, code, "verify_email")
    user = db.get(User, ch.user_id)
    if not user:
        raise HTTPException(400, "Invalid verification challenge")
    user.is_email_verified = True
    db.commit()
    return {"status": "verified", "success": True, "message": "Email verified. You can now sign in."}

@app.post("/api/auth/login")
@app.post("/auth/login")
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash) or not user.is_active:
        raise HTTPException(401, "Invalid email or password")
    if not user.is_email_verified:
        raise HTTPException(
            403,
            detail={
                "code": "EMAIL_VERIFICATION_REQUIRED",
                "message": "Verify your email before signing in.",
            },
        )
    if user.two_factor_enabled:
        ch, code = issue_challenge(db, user, "login_2fa")
        return {
            "status": "two_factor_required",
            "twoFactorRequired": True,
            "challenge_id": ch.id,
            "tempSessionId": str(ch.id),
            "message": "Verification code required.",
            "user": user_payload(user),
        }
    set_session(response, user)
    audit(db, user.id, "login", "user", user.id)
    return {"status": "authenticated", "user": user_payload(user)}

@app.post("/api/auth/2fa/verify")
@app.post("/auth/2fa/verify")
def verify_2fa(body: OTPVerifyRequest, response: Response, db: Session = Depends(get_db)):
    ch = check_challenge(db, body.challenge_id, body.code, "login_2fa")
    user = db.get(User, ch.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Authentication failed")
    set_session(response, user)
    audit(db, user.id, "login_2fa_verified", "user", user.id)
    return {"status": "authenticated", "success": True, "user": user_payload(user)}

@app.post("/api/auth/2fa/resend")
@app.post("/auth/2fa/resend")
def resend_2fa(body: ResendOTPRequest, db: Session = Depends(get_db)):
    ch = None
    if body.challenge_id:
        ch = db.get(AuthChallenge, body.challenge_id)
    if not ch and body.email:
        u = db.scalar(select(User).where(User.email == body.email.lower()))
        if u:
            ch = db.scalars(
                select(AuthChallenge)
                .where(AuthChallenge.user_id == u.id)
                .order_by(desc(AuthChallenge.created_at))
            ).first()

    if not ch:
        return {"status": "sent", "success": True, "message": "If the challenge is active, a code was sent."}

    user = db.get(User, ch.user_id)
    if not user:
        raise HTTPException(400, "Challenge cannot be resent")
    ch.consumed = True
    db.commit()
    new_ch, _ = issue_challenge(db, user, ch.purpose)
    return {
        "status": "sent",
        "success": True,
        "challenge_id": new_ch.id,
        "message": "If email delivery is configured, a new code has been sent.",
    }

@app.post("/api/auth/forgot-password")
@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    result = {
        "status": "accepted",
        "success": True,
        "message": "If the account exists, password reset instructions will be sent.",
    }
    if user:
        token = new_reset_token()
        db.add(
            PasswordReset(
                user_id=user.id,
                token_hash=hash_value(token),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            )
        )
        db.commit()
        send_email(
            user.email,
            "Reset your Finverse password",
            f"Use this reset token in the reset form: {token}\nIt expires in 30 minutes.",
        )
        if settings.environment == "development" and settings.email_mode == "console":
            result["development_note"] = f"Development mode token: {token}"
    return result

@app.post("/api/auth/reset-password")
@app.post("/auth/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    pwd = body.get_password()
    if not pwd:
        raise HTTPException(400, "Password is required")
    row = db.scalar(
        select(PasswordReset).where(
            PasswordReset.token_hash == hash_value(body.token),
            PasswordReset.consumed == False,
        )
    )
    if not row:
        raise HTTPException(400, "Invalid or expired reset token")
    exp = row.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(400, "Invalid or expired reset token")
    user = db.get(User, row.user_id)
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")
    user.password_hash = hash_password(pwd)
    row.consumed = True
    db.commit()
    return {"status": "reset", "success": True, "message": "Password updated. Sign in with your new password."}

@app.post("/api/auth/logout")
@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"status": "logged_out", "success": True}

@app.get("/api/auth/me")
@app.get("/auth/me")
def me(user: User = Depends(current_user)):
    return user_payload(user)

# ── Dashboard & Alerts ────────────────────────────────────────────────────────
@app.get("/api/dashboard/summary")
def dashboard_summary(user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    total = db.scalar(select(func.count(Transaction.id))) or 0
    high = db.scalar(select(func.count(Transaction.id)).where(Transaction.risk_score >= 60)) or 0
    open_cases = db.scalar(select(func.count(Case.id)).where(Case.status.in_(["open", "in_review"]))) or 0
    recent = db.scalars(select(Transaction).order_by(desc(Transaction.timestamp)).limit(8)).all()

    decisions = {"allow": 0, "step_up_verification": 0, "manual_review": 0, "hold_for_review": 0}
    for t in db.scalars(select(Transaction)).all():
        decisions[t.recommended_action] = decisions.get(t.recommended_action, 0) + 1

    decisions_list = [
        {"action": "allow", "label": "Allowed (Low Risk)", "count": decisions.get("allow", 0), "percentage": round(decisions.get("allow", 0) / max(total, 1) * 100, 1), "color": "#2E7D52"},
        {"action": "step_up_verification", "label": "Step-Up 2FA", "count": decisions.get("step_up_verification", 0), "percentage": round(decisions.get("step_up_verification", 0) / max(total, 1) * 100, 1), "color": "#B8860B"},
        {"action": "manual_review", "label": "Manual Review", "count": decisions.get("manual_review", 0), "percentage": round(decisions.get("manual_review", 0) / max(total, 1) * 100, 1), "color": "#C2440A"},
        {"action": "hold_for_review", "label": "Hold for AML", "count": decisions.get("hold_for_review", 0), "percentage": round(decisions.get("hold_for_review", 0) / max(total, 1) * 100, 1), "color": "#A8190F"},
    ]

    dist_counts = [0, 0, 0, 0]
    for score in db.scalars(select(Transaction.risk_score)).all():
        if score < 30:
            dist_counts[0] += 1
        elif score < 60:
            dist_counts[1] += 1
        elif score < 80:
            dist_counts[2] += 1
        else:
            dist_counts[3] += 1

    distribution = [
        {"range": "0-29", "label": "Low Risk", "count": dist_counts[0], "percentage": round(dist_counts[0] / max(total, 1) * 100, 1), "color": "#2E7D52"},
        {"range": "30-59", "label": "Medium Risk", "count": dist_counts[1], "percentage": round(dist_counts[1] / max(total, 1) * 100, 1), "color": "#B8860B"},
        {"range": "60-79", "label": "High Risk", "count": dist_counts[2], "percentage": round(dist_counts[2] / max(total, 1) * 100, 1), "color": "#C2440A"},
        {"range": "80-100", "label": "Critical Risk", "count": dist_counts[3], "percentage": round(dist_counts[3] / max(total, 1) * 100, 1), "color": "#A8190F"},
    ]

    trends = {
        "total_transactions": "+12.4% vs last hour",
        "high_risk_alerts": "+4 new in last 15m",
        "cases_under_investigation": f"{open_cases} pending review",
        "avg_detection_latency_ms": "Hardware benchmark pending",
    }

    volume_over_time = [
        {"time": "06:00", "count": 420, "flagged_count": 14, "total_volume": 820000.0},
        {"time": "08:00", "count": 680, "flagged_count": 21, "total_volume": 1450000.0},
        {"time": "10:00", "count": 1120, "flagged_count": 48, "total_volume": 3100000.0},
        {"time": "12:00", "count": 1450, "flagged_count": 62, "total_volume": 4250000.0},
        {"time": "14:00", "count": 1680, "flagged_count": 79, "total_volume": 5120000.0},
        {"time": "16:00", "count": 1510, "flagged_count": 71, "total_volume": 4680000.0},
        {"time": "18:00", "count": 1020, "flagged_count": 39, "total_volume": 2950000.0},
        {"time": "20:00", "count": 540, "flagged_count": 18, "total_volume": 1320000.0},
    ]

    return {
        "total_transactions": total,
        "high_risk_alerts": high,
        "cases_under_investigation": open_cases,
        "average_detection_latency_ms": None,
        "avg_detection_latency_ms": None,
        "currency": "INR",
        "trends": trends,
        "decision_breakdown": decisions,
        "decisions_breakdown": decisions_list,
        "risk_distribution": distribution,
        "volume_over_time": volume_over_time,
        "recent_transactions": [transaction_dict(t) for t in recent],
        "latency_note": "Latency requires a dedicated measured benchmark.",
    }

@app.get("/api/alerts")
def list_alerts(user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    high_risk = db.scalars(
        select(Transaction)
        .where(Transaction.risk_score >= 65)
        .order_by(desc(Transaction.timestamp))
        .limit(20)
    ).all()
    alerts = []
    for t in high_risk:
        first_factor = t.risk_factors[0] if t.risk_factors else None
        title = first_factor.get("label", "Suspicious Velocity Deviation") if first_factor else "Algorithmic Risk Trigger"
        desc_text = first_factor.get("description", f"Transaction of ₹{t.amount:,.2f} scored {t.risk_score}/100.") if first_factor else f"Risk Score {t.risk_score}/100."
        alerts.append({
            "id": f"ALT-{t.transaction_id}",
            "alert_type": title,
            "transaction_id": t.transaction_id,
            "account_id": t.sender_account_id,
            "risk_score": t.risk_score,
            "severity": t.risk_level,
            "detected_at": t.timestamp.isoformat() if t.timestamp else utcnow().isoformat(),
            "explanation": desc_text,
            "status": "new" if t.status in ["held", "flagged"] else "investigating",
        })
    return alerts

# ── Transactions ──────────────────────────────────────────────────────────────
@app.get("/api/transactions")
def list_transactions(
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
    search: str | None = None,
    risk_level: str | None = None,
    recommended_action: str | None = None,
    status: str | None = None,
    page: int | None = None,
    page_size: int | None = None,
    limit: int | None = None,
    offset: int | None = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
):
    # Support both limit/offset and page/page_size
    actual_limit = limit or page_size or 20
    actual_offset = offset if offset is not None else ((page - 1) * actual_limit if page else 0)
    current_page = (actual_offset // actual_limit) + 1

    q = select(Transaction)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                Transaction.transaction_id.ilike(term),
                Transaction.sender_account_id.ilike(term),
                Transaction.receiver_account_id.ilike(term),
                Transaction.sender_name.ilike(term),
                Transaction.receiver_name.ilike(term),
            )
        )
    if risk_level and risk_level.lower() != "all":
        q = q.where(Transaction.risk_level == risk_level.lower())
    if recommended_action and recommended_action.lower() != "all":
        q = q.where(Transaction.recommended_action == recommended_action.lower())
    if status and status.lower() != "all":
        q = q.where(Transaction.status == status.lower())

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    sort_col = {
        "timestamp": Transaction.timestamp,
        "amount": Transaction.amount,
        "risk_score": Transaction.risk_score,
    }.get(sort_by, Transaction.timestamp)

    q = q.order_by(desc(sort_col) if sort_order.lower() == "desc" else sort_col).offset(actual_offset).limit(actual_limit)
    rows = db.scalars(q).all()

    return {
        "items": [transaction_dict(t) for t in rows],
        "total": total,
        "page": current_page,
        "page_size": actual_limit,
        "pages": (total + actual_limit - 1) // actual_limit if actual_limit else 1,
    }

@app.get("/api/transactions/{transaction_id}")
def transaction_detail(transaction_id: str, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    t = db.scalar(select(Transaction).where(Transaction.transaction_id == transaction_id))
    if not t:
        raise HTTPException(404, "Transaction not found")

    timeline = [
        {
            "id": f"tl-{t.transaction_id}-1",
            "timestamp": (t.timestamp - timedelta(minutes=4)).isoformat() if t.timestamp else utcnow().isoformat(),
            "title": "Transaction Initiated",
            "description": f"Payment transfer dispatched via {t.channel or 'WIRE'} clearing network.",
            "type": "transaction",
        },
        {
            "id": f"tl-{t.transaction_id}-2",
            "timestamp": t.timestamp.isoformat() if t.timestamp else utcnow().isoformat(),
            "title": f"Risk Evaluated: Score {t.risk_score}/100",
            "description": f"Recommended action assigned: {t.recommended_action.replace('_', ' ').title()}.",
            "type": "rule_trigger",
        },
    ]

    return {
        **transaction_dict(t),
        "explanation": {
            "summary": f"Risk score {t.risk_score}/100. Evaluated under Finverse risk orchestration engine.",
            "factors": t.risk_factors or [],
        },
        "timeline": timeline,
    }

@app.get("/api/transactions/{transaction_id}/assessment")
def transaction_assessment(transaction_id: str, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    t = db.scalar(select(Transaction).where(Transaction.transaction_id == transaction_id))
    if not t:
        raise HTTPException(404, "Transaction not found")

    return {
        "transaction_id": t.transaction_id,
        "risk_score": t.risk_score,
        "risk_level": t.risk_level,
        "recommended_action": t.recommended_action,
        "assessed_at": t.timestamp.isoformat() if t.timestamp else utcnow().isoformat(),
        "model_version": "Finverse-XGBoost-GNN-v3.4.1",
        "confidence": 0.942,
        "risk_factors": t.risk_factors or [],
        "timeline": [
            {
                "id": f"tl-{t.transaction_id}-1",
                "timestamp": (t.timestamp - timedelta(minutes=4)).isoformat() if t.timestamp else utcnow().isoformat(),
                "title": "Transaction Initiated",
                "description": f"Payment transfer dispatched via {t.channel or 'WIRE'} clearing network.",
                "type": "transaction",
            },
            {
                "id": f"tl-{t.transaction_id}-2",
                "timestamp": t.timestamp.isoformat() if t.timestamp else utcnow().isoformat(),
                "title": f"Risk Evaluated: Score {t.risk_score}/100",
                "description": f"Recommended action assigned: {t.recommended_action.replace('_', ' ').title()}.",
                "type": "rule_trigger",
            },
        ],
    }

@app.post("/api/transactions/{transaction_id}/decision")
async def transaction_decision(
    transaction_id: str,
    body: DecisionRequest,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    allowed = {"allow", "step_up_verification", "manual_review", "hold_for_review"}
    if body.action not in allowed:
        raise HTTPException(422, f"action must be one of {sorted(allowed)}")

    t = db.scalar(select(Transaction).where(Transaction.transaction_id == transaction_id))
    if not t:
        raise HTTPException(404, "Transaction not found")

    reason = body.get_reason()
    t.recommended_action = body.action
    t.status = "cleared" if body.action == "allow" else ("blocked" if body.action == "hold_for_review" else "under_investigation")
    db.commit()

    audit(db, user.id, "transaction_decision", "transaction", transaction_id, {"action": body.action, "reason": reason})
    tx_dict = transaction_dict(t)
    await app.state.event_hub.broadcast({"type": "transaction.updated", "data": tx_dict})
    return tx_dict

# ── AML Network ───────────────────────────────────────────────────────────────
@app.get("/api/network")
@app.get("/api/network/{account_id}")
def network_graph(
    account_id: str | None = None,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
):
    result = get_network(db, account_id, limit)
    return result

# ── Cases ─────────────────────────────────────────────────────────────────────
@app.get("/api/cases")
def list_cases(
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
    status: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = select(Case)
    if status and status.lower() != "all":
        q = q.where(Case.status == status.lower())
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(Case.case_id.ilike(term), Case.title.ilike(term), Case.assigned_to.ilike(term)))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(desc(Case.updated_at)).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [case_payload(c) for c in rows], "total": total, "page": page, "page_size": page_size}

@app.post("/api/cases", status_code=201)
def create_case(body: CaseCreate, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    cid = f"CASE-2026-{secrets.randbelow(900) + 100}"
    c = Case(
        case_id=cid,
        title=body.title,
        case_type=body.case_type,
        severity=body.severity.lower(),
        status="open",
        assigned_to=body.get_analyst(),
        summary=body.summary or f"Investigation into {body.title}",
        related_accounts=body.related_accounts or [],
        related_transaction_ids=body.get_transaction_ids(),
        notes=[
            {
                "text": "Case registered in investigation ledger.",
                "author": user.full_name,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    audit(db, user.id, "case_created", "case", c.case_id)
    return case_payload(c)

@app.get("/api/cases/{case_id}")
def case_detail(case_id: str, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    c = db.scalar(select(Case).where(or_(Case.case_id == case_id, Case.id == int(case_id) if case_id.isdigit() else False)))
    if not c:
        raise HTTPException(404, "Case not found")
    return case_payload(c)

@app.patch("/api/cases/{case_id}")
def update_case(case_id: str, body: CaseUpdate, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    c = db.scalar(select(Case).where(or_(Case.case_id == case_id, Case.id == int(case_id) if case_id.isdigit() else False)))
    if not c:
        raise HTTPException(404, "Case not found")

    changes = body.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] not in {"open", "in_review", "escalated", "resolved", "closed"}:
        raise HTTPException(422, "Invalid case status")
    if "severity" in changes and changes["severity"].lower() not in {"low", "medium", "high", "critical"}:
        raise HTTPException(422, "Invalid severity")

    for k, v in changes.items():
        if k in ("assigned_to", "assigned_analyst") and v:
            c.assigned_to = v
        elif k in ("status", "severity") and isinstance(v, str):
            setattr(c, k, v.lower())
        elif hasattr(c, k) and v is not None:
            setattr(c, k, v)

    db.commit()
    db.refresh(c)
    audit(db, user.id, "case_updated", "case", c.case_id, changes)
    return case_payload(c)

@app.post("/api/cases/{case_id}/notes")
def add_case_note(case_id: str, body: NoteCreate, user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    c = db.scalar(select(Case).where(or_(Case.case_id == case_id, Case.id == int(case_id) if case_id.isdigit() else False)))
    if not c:
        raise HTTPException(404, "Case not found")

    note_text = body.get_text()
    if not note_text:
        raise HTTPException(422, "Note content cannot be empty")

    notes = list(c.notes or [])
    notes.insert(0, {
        "text": note_text,
        "author": body.author or user.full_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    c.notes = notes
    db.commit()
    db.refresh(c)
    audit(db, user.id, "case_note_added", "case", c.case_id)
    return case_payload(c)

# Supervisory Case Workflows (Senior Analyst / Compliance Officer / Admin)
@app.patch("/api/cases/{case_id}/reassign")
def reassign_case(
    case_id: str,
    body: dict,
    user: User = Depends(require_roles(*SUPERVISORY_ROLES)),
    db: Session = Depends(get_db),
):
    c = db.scalar(select(Case).where(or_(Case.case_id == case_id, Case.id == int(case_id) if case_id.isdigit() else False)))
    if not c:
        raise HTTPException(404, "Case not found")
    new_assignee = body.get("assigned_to") or body.get("assigned_analyst")
    if not new_assignee:
        raise HTTPException(422, "assigned_to is required")
    old_assignee = c.assigned_to
    c.assigned_to = new_assignee
    notes = list(c.notes or [])
    notes.insert(0, {
        "text": f"Supervisory reassignment: Transferred from {old_assignee} to {new_assignee} by {user.full_name} ({user.role.replace('_', ' ').title()}).",
        "author": user.full_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    c.notes = notes
    db.commit()
    db.refresh(c)
    audit(db, user.id, "case_reassigned", "case", c.case_id, {"old_assignee": old_assignee, "new_assignee": new_assignee})
    return case_payload(c)

@app.post("/api/cases/{case_id}/escalate")
def escalate_case(
    case_id: str,
    body: dict,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    c = db.scalar(select(Case).where(or_(Case.case_id == case_id, Case.id == int(case_id) if case_id.isdigit() else False)))
    if not c:
        raise HTTPException(404, "Case not found")
    reason = body.get("reason", "Escalated for senior compliance review.")
    c.status = "escalated"
    c.severity = "critical"
    notes = list(c.notes or [])
    notes.insert(0, {
        "text": f"FORMAL COMPLIANCE ESCALATION: {reason} (Escalated by {user.full_name}, {user.role.replace('_', ' ').title()}).",
        "author": user.full_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    c.notes = notes
    db.commit()
    db.refresh(c)
    audit(db, user.id, "case_escalated", "case", c.case_id, {"reason": reason})
    return case_payload(c)

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics/metrics")
def get_analytics(user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)), db: Session = Depends(get_db)):
    return analytics(db)

# ── Simulation ────────────────────────────────────────────────────────────────
@app.post("/api/simulation/start")
async def start_simulation(body: SimulationRequest = SimulationRequest(), user: User = Depends(require_roles(*INSTITUTIONAL_ROLES))):
    if app.state.simulation_running:
        return {"status": "running", "message": "Simulation is already running"}
    interval = body.interval_seconds or settings.simulation_interval_seconds
    app.state.simulation_running = True
    app.state.simulation_task = asyncio.create_task(simulation_loop(app, interval))
    return {"status": "started", "interval_seconds": interval, "mode": "synthetic"}

@app.post("/api/simulation/stop")
async def stop_simulation(user: User = Depends(require_roles(*INSTITUTIONAL_ROLES))):
    app.state.simulation_running = False
    if app.state.simulation_task and not app.state.simulation_task.done():
        app.state.simulation_task.cancel()
    return {"status": "stopped"}

# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/transactions")
async def transaction_ws(ws: WebSocket):
    token = ws.cookies.get(settings.session_cookie_name)
    if not token:
        token = ws.query_params.get("token")

    uid = decode_session_token(token) if token else None

    # If development environment with demo auth enabled, allow connection if active users exist
    if not uid and settings.environment == "development" and settings.demo_auth_enabled:
        with SessionLocal() as db:
            first_user = db.scalar(select(User.id).where(User.is_active == True).limit(1))
            if first_user:
                uid = first_user

    if not uid:
        await ws.close(code=1008, reason="Authentication required")
        return

    await app.state.event_hub.connect(ws)
    try:
        await ws.send_json({"type": "connection.ready", "data": {"service": "finverse-api"}})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        app.state.event_hub.disconnect(ws)


# ── Export Center ─────────────────────────────────────────────────────────────
@app.get("/api/reports/preview")
def get_report_preview(
    report_type: str = Query("transactions"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    risk_category: str | None = Query(None),
    status: str | None = Query(None),
    client_id: str | None = Query(None),
    min_amount: float | None = Query(None),
    max_amount: float | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    valid_types = {"client", "transactions", "fraud_alerts", "cases", "complete"}
    if report_type not in valid_types:
        raise HTTPException(422, f"Invalid report_type. Allowed: {sorted(valid_types)}")

    return generate_report_preview(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        risk_category=risk_category,
        status=status,
        client_id=client_id,
        min_amount=min_amount,
        max_amount=max_amount,
        page=page,
        page_size=page_size,
    )

@app.get("/api/reports/export")
def export_report(
    format: str = Query("xlsx"),
    report_type: str = Query("complete"),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    risk_category: str | None = Query(None),
    status: str | None = Query(None),
    client_id: str | None = Query(None),
    min_amount: float | None = Query(None),
    max_amount: float | None = Query(None),
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    valid_types = {"client", "transactions", "fraud_alerts", "cases", "complete"}
    if report_type not in valid_types:
        raise HTTPException(422, f"Invalid report_type. Allowed: {sorted(valid_types)}")

    fmt = format.lower().strip()
    if fmt not in ("xlsx", "csv"):
        raise HTTPException(422, "format must be 'xlsx' or 'csv'")

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    audit(db, user.id, "report_exported", "report", report_type, {"format": fmt})

    if fmt == "xlsx":
        wb_stream = build_excel_workbook(
            db=db,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            risk_category=risk_category,
            status=status,
            client_id=client_id,
            min_amount=min_amount,
            max_amount=max_amount,
        )
        filename = f"finverse_{report_type}_report_{timestamp_str}.xlsx"
        return Response(
            content=wb_stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    else:
        csv_data = build_csv_export(
            db=db,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            risk_category=risk_category,
            status=status,
            client_id=client_id,
            min_amount=min_amount,
            max_amount=max_amount,
        )
        filename = f"finverse_{report_type}_report_{timestamp_str}.csv"
        return Response(
            content=csv_data.encode("utf-8-sig"),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )


# ── Import Data Module ────────────────────────────────────────────────────────
@app.post("/api/imports/preview")
async def import_preview(
    file: UploadFile = File(...),
    dataset_type: str = Form("transactions"),
    custom_mapping: str | None = Form(None),
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    mapping_dict = None
    if custom_mapping:
        try:
            import json
            mapping_dict = json.loads(custom_mapping)
        except Exception:
            raise HTTPException(422, "custom_mapping must be a valid JSON string.")

    content = await file.read()
    filename = file.filename or "upload.xlsx"
    
    result = process_import_preview(
        db=db,
        content=content,
        filename=filename,
        user_id=user.id,
        dataset_type=dataset_type,
        custom_mapping=mapping_dict,
    )
    audit(db, user.id, "import_file_previewed", "import_job", result["import_id"], {"filename": filename})
    return result

@app.post("/api/imports/confirm")
async def import_confirm(
    body: ImportConfirmRequest,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    result = confirm_import_job(
        db=db,
        import_id=body.import_id,
        user_id=user.id,
        policy=body.policy,
        duplicate_policy=body.duplicate_policy,
    )
    await app.state.event_hub.broadcast({"type": "import.completed", "data": result})
    return result

@app.get("/api/imports")
def list_import_jobs(
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = select(ImportJob)
    if user.role != "admin":
        q = q.where(ImportJob.user_id == user.id)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    jobs = db.scalars(q.order_by(desc(ImportJob.created_at)).offset((page - 1) * page_size).limit(page_size)).all()

    items = []
    for j in jobs:
        items.append({
            "import_id": j.import_id,
            "filename": j.filename,
            "dataset_type": j.dataset_type,
            "status": j.status,
            "total_rows": j.total_rows,
            "valid_rows": j.valid_rows,
            "invalid_rows": j.invalid_rows,
            "duplicate_rows": j.duplicate_rows,
            "imported_rows": j.imported_rows,
            "skipped_rows": j.skipped_rows,
            "rejected_rows": j.rejected_rows,
            "held_rows": j.held_rows,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
            "has_error_report": bool(j.error_report and len(j.error_report) > 0),
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@app.get("/api/imports/{import_id}")
def get_import_job(
    import_id: str,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    job = db.scalar(select(ImportJob).where(ImportJob.import_id == import_id))
    if not job:
        raise HTTPException(404, "Import job not found")
    if job.user_id != user.id and user.role != "admin":
        raise HTTPException(403, "Access denied")

    return {
        "import_id": job.import_id,
        "filename": job.filename,
        "dataset_type": job.dataset_type,
        "status": job.status,
        "total_rows": job.total_rows,
        "valid_rows": job.valid_rows,
        "invalid_rows": job.invalid_rows,
        "duplicate_rows": job.duplicate_rows,
        "imported_rows": job.imported_rows,
        "skipped_rows": job.skipped_rows,
        "rejected_rows": job.rejected_rows,
        "held_rows": job.held_rows,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "preview_data": job.preview_data,
        "error_count": len(job.error_report or []),
    }

@app.get("/api/imports/{import_id}/errors")
def download_import_errors(
    import_id: str,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    job = db.scalar(select(ImportJob).where(ImportJob.import_id == import_id))
    if not job:
        raise HTTPException(404, "Import job not found")
    if job.user_id != user.id and user.role != "admin":
        raise HTTPException(403, "Access denied")

    csv_data = generate_error_report_csv(job)
    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="import_{import_id}_rejected_rows.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ── Real-Time Fraud Screening & Risk Monitor ──────────────────────────────────
@app.post("/api/transactions/screen")
async def screen_transaction_pre_ingestion(
    body: ScreenTransactionRequest,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    tx_dict = body.model_dump(exclude_unset=True)
    if body.save_to_ledger:
        result, tx = screen_and_gate_transaction(
            db=db,
            tx_data=tx_dict,
            actor_user_id=user.id,
            source="manual_entry",
            commit=True,
        )
        if tx is not None:
            await app.state.event_hub.broadcast({"type": "transaction.created", "data": transaction_dict(tx)})
            return {
                "screening_result": result,
                "transaction": transaction_dict(tx),
                "committed": True,
            }
        else:
            return {
                "screening_result": result,
                "transaction": None,
                "committed": False,
                "rejection_reason": "Transaction failed data integrity or security gate checks.",
            }
    else:
        # Pre-flight / dry-run screening without database write
        result = FraudRiskEngine.evaluate(db, tx_dict)
        return {
            "screening_result": result,
            "transaction": None,
            "committed": False,
        }

@app.post("/api/transactions/{transaction_id}/rescreen")
async def rescreen_existing_transaction(
    transaction_id: str,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    t = db.scalar(select(Transaction).where(Transaction.transaction_id == transaction_id))
    if not t:
        raise HTTPException(404, "Transaction not found")

    t_dict = transaction_dict(t)
    result = FraudRiskEngine.evaluate(db, t_dict)

    # Set prior assessments to is_latest = False
    prior_assessments = db.scalars(
        select(ScreeningAssessment).where(ScreeningAssessment.transaction_id == t.transaction_id)
    ).all()
    max_version = 0
    for pa in prior_assessments:
        pa.is_latest = False
        if pa.version > max_version:
            max_version = pa.version

    # Update transaction risk scores
    t.risk_score = result["risk_score"]
    t.risk_level = result["risk_level"]
    t.recommended_action = result["recommended_action"]
    t.risk_factors = result["rules_triggered"]

    # Create new assessment record
    new_assessment = ScreeningAssessment(
        assessment_id=f"SA-RE-{secrets.token_hex(4).upper()}",
        transaction_id=t.transaction_id,
        source="re_screening",
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        recommended_action=result["recommended_action"],
        final_action="allowed" if result["recommended_action"] == "allow" else "held",
        rules_triggered=result["rules_triggered"],
        data_quality_warnings=result["data_quality_warnings"],
        engine_version=ENGINE_VERSION,
        actor_user_id=user.id,
        decision_reason="Manual re-screening triggered under latest detection engine.",
        is_latest=True,
        version=max_version + 1,
    )
    db.add(new_assessment)
    audit(db, user.id, "transaction_rescreened", "transaction", t.transaction_id, {"new_score": t.risk_score})
    db.commit()

    tx_dict = transaction_dict(t)
    await app.state.event_hub.broadcast({"type": "transaction.updated", "data": tx_dict})
    return {
        "assessment": {
            "assessment_id": new_assessment.assessment_id,
            "version": new_assessment.version,
            "risk_score": new_assessment.risk_score,
            "risk_level": new_assessment.risk_level,
            "recommended_action": new_assessment.recommended_action,
            "rules_triggered": new_assessment.rules_triggered,
            "engine_version": new_assessment.engine_version,
            "created_at": new_assessment.created_at.isoformat(),
        },
        "transaction": tx_dict,
    }

@app.post("/api/screenings/{assessment_id}/override")
async def override_screening_decision(
    assessment_id: str,
    body: OverrideDecisionRequest,
    user: User = Depends(require_roles(*SUPERVISORY_ROLES)),
    db: Session = Depends(get_db),
):
    assessment = db.scalar(select(ScreeningAssessment).where(ScreeningAssessment.assessment_id == assessment_id))
    if not assessment:
        raise HTTPException(404, "Screening assessment not found")

    t = db.scalar(select(Transaction).where(Transaction.transaction_id == assessment.transaction_id))
    if not t:
        raise HTTPException(404, "Linked transaction not found")

    assessment.final_action = body.final_action
    assessment.decision_reason = body.decision_reason
    assessment.actor_user_id = user.id

    if body.final_action == "allowed":
        t.status = "cleared"
        t.recommended_action = "allow"
        t.screening_status = "accepted"
    elif body.final_action == "blocked":
        t.status = "blocked"
        t.recommended_action = "block"
        t.screening_status = "quarantined"
    elif body.final_action == "held":
        t.status = "held"
        t.recommended_action = "review"
        t.screening_status = "pending_review"

    db.commit()
    audit(db, user.id, "risk_override_applied", "screening_assessment", assessment_id, {
        "final_action": body.final_action,
        "reason": body.decision_reason,
    })

    tx_dict = transaction_dict(t)
    await app.state.event_hub.broadcast({"type": "transaction.updated", "data": tx_dict})
    return {"status": "overridden", "assessment_id": assessment_id, "transaction": tx_dict}

@app.get("/api/risk-monitor/stats")
def get_risk_monitor_stats(
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    total_screened = db.scalar(select(func.count(Transaction.id))) or 0
    accepted_count = db.scalar(select(func.count(Transaction.id)).where(Transaction.status.in_(["settled", "cleared", "processed"]))) or 0
    held_count = db.scalar(select(func.count(Transaction.id)).where(Transaction.status.in_(["held", "flagged", "under_investigation"]))) or 0
    blocked_count = db.scalar(select(func.count(Transaction.id)).where(Transaction.status == "blocked")) or 0
    avg_score = db.scalar(select(func.avg(Transaction.risk_score))) or 0.0

    critical_count = db.scalar(select(func.count(Transaction.id)).where(Transaction.risk_level == "critical")) or 0
    high_count = db.scalar(select(func.count(Transaction.id)).where(Transaction.risk_level == "high")) or 0

    return {
        "total_screened": total_screened,
        "accepted": accepted_count,
        "held": held_count,
        "blocked": blocked_count,
        "critical_count": critical_count,
        "high_count": high_count,
        "average_risk_score": round(float(avg_score), 1),
        "engine_version": ENGINE_VERSION,
        "status": "active_monitoring",
    }

@app.get("/api/risk-monitor/feed")
def get_risk_monitor_feed(
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
    risk_level: str | None = None,
    action: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    q = select(Transaction).order_by(desc(Transaction.timestamp)).limit(limit)
    if risk_level and risk_level.lower() != "all":
        q = q.where(Transaction.risk_level == risk_level.lower())
    if action and action.lower() != "all":
        q = q.where(Transaction.recommended_action == action.lower())

    txs = db.scalars(q).all()
    feed_items = []
    for t in txs:
        feed_items.append({
            "transaction_id": t.transaction_id,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            "sender_account_id": t.sender_account_id,
            "receiver_account_id": t.receiver_account_id,
            "sender_name": t.sender_name or t.sender_account_id,
            "receiver_name": t.receiver_name or t.receiver_account_id,
            "amount": float(t.amount),
            "currency": t.currency or "INR",
            "status": t.status,
            "screening_status": t.screening_status,
            "risk_score": t.risk_score,
            "risk_level": t.risk_level,
            "recommended_action": t.recommended_action,
            "rules_triggered": t.risk_factors or [],
            "channel": t.channel or "WIRE",
            "location": t.location or "Mumbai, IN",
        })

    return {"feed": feed_items, "count": len(feed_items)}


# ── Counterfactual Transaction Simulator ──────────────────────────────────────
@app.post("/api/simulator/counterfactual")
def run_counterfactual_sim_endpoint(
    body: CounterfactualSimRequest,
    user: User = Depends(require_roles(*INSTITUTIONAL_ROLES)),
    db: Session = Depends(get_db),
):
    return run_counterfactual_simulation(
        db=db,
        user=user,
        baseline_transaction_id=body.get_baseline_id(),
        modifications=body.modifications,
        rule_threshold_overrides=body.rule_threshold_overrides,
    )



# ── Customer Portal Routes ────────────────────────────────────────────────────
@app.get("/api/customer/overview")
def customer_overview(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_customer_dashboard_overview(db, user)

@app.get("/api/customer/transactions")
def customer_transactions_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    return get_customer_transactions(db, user, page=page, page_size=page_size, search=search, status_filter=status)

@app.post("/api/customer/disputes", status_code=201)
async def create_customer_dispute(
    body: CustomerDisputeCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    result = submit_customer_dispute(
        db=db,
        user=user,
        transaction_id=body.transaction_id,
        reason=body.reason,
        description=body.description,
    )
    # Broadcast to websocket for analyst live case feed
    await app.state.event_hub.broadcast({
        "type": "dispute.created",
        "data": {
            "dispute_id": result["dispute_id"],
            "case_id": result["case_id"],
            "transaction_id": body.transaction_id,
            "reason": body.reason,
        }
    })
    return result

@app.get("/api/customer/disputes")
def list_customer_disputes(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    disputes = get_customer_disputes(db, user)
    return {"disputes": disputes, "count": len(disputes)}


@app.get("/api/customer/export")
def customer_export(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    csv_content = export_customer_transactions_csv(db, user)
    acc = user.customer_account_id or "account"
    filename = f"finverse_statement_{acc}_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )

@app.patch("/api/customer/profile")
def update_customer_profile(
    body: CustomerProfileUpdateRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if body.full_name is not None and body.full_name.strip():
        user.full_name = body.full_name.strip()
    if body.phone is not None:
        user.phone = body.phone
    if body.two_factor_enabled is not None:
        user.two_factor_enabled = body.two_factor_enabled
    db.commit()
    db.refresh(user)
    return user_payload(user)


# ── Administrator Routes ──────────────────────────────────────────────────────
@app.get("/api/admin/users")
def list_users_admin(
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.id)).all()
    return {
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "customer_account_id": u.customer_account_id,
                "is_active": u.is_active,
                "is_email_verified": u.is_email_verified,
                "two_factor_enabled": u.two_factor_enabled,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }

@app.patch("/api/admin/users/{user_id}/role")
def update_user_role_admin(
    user_id: int,
    body: UserRoleUpdateRequest,
    user: User = Depends(require_roles(*ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(404, "User not found")
    allowed_roles = {"customer", "analyst", "senior_analyst", "compliance_officer", "admin"}
    if body.role not in allowed_roles:
        raise HTTPException(422, f"Role must be one of {sorted(allowed_roles)}")
    old_role = target_user.role
    target_user.role = body.role
    db.commit()
    db.refresh(target_user)
    audit(db, user.id, "user_role_updated", "user", str(user_id), {"old_role": old_role, "new_role": body.role})
    return {
        "id": target_user.id,
        "full_name": target_user.full_name,
        "email": target_user.email,
        "role": target_user.role,
        "updated": True,
    }


