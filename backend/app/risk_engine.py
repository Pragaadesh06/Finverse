"""
Finverse Central Fraud & AML Risk Engine
Evaluates transactions pre-ingestion across:
- Data Integrity Rules (RULE-INT-*)
- Behavioral & Velocity Rules (RULE-BEH-*)
- Network & AML Topology Rules (RULE-AML-*)
"""
from datetime import datetime, timezone, timedelta
from typing import Any
import re
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session
from app.models import Transaction, ScreeningAssessment, AuditEvent

KNOWN_CIRCULAR_RING = {"ACC-8491", "ACC-3042", "ACC-6109", "ACC-1928"}
HIGH_RISK_JURISDICTIONS = {"PRK", "IRN", "MMR", "PAN", "CYP", "VUT"}
HIGH_RISK_CHANNELS = {"CRYPTO_GATEWAY", "HAWALA", "ANONYMOUS_PREPAID", "OFFSHORE_WIRE"}

ENGINE_VERSION = "Finverse-RiskGate-v2.1"

class FraudRiskEngine:
    """
    Explainable, deterministic heuristic & topology risk engine.
    Computes a score from 0-100, risk level, recommended action, and triggered rules.
    """

    @staticmethod
    def evaluate(
        db: Session | None,
        tx_data: dict[str, Any],
        existing_tx_ids: set[str] | None = None,
    ) -> dict[str, Any]:
        """
        Evaluate a single candidate transaction.
        Returns:
            - is_valid (bool)
            - integrity_errors (list[dict])
            - data_quality_warnings (list[str])
            - risk_score (int 0-100)
            - risk_level ("low", "medium", "high", "critical")
            - recommended_action ("allow", "review", "block", "reject")
            - rules_triggered (list[dict])
            - features (dict)
        """
        rules_triggered: list[dict[str, Any]] = []
        integrity_errors: list[dict[str, Any]] = []
        warnings: list[str] = []
        
        tx_id = str(tx_data.get("transaction_id") or "").strip()
        sender_id = str(tx_data.get("sender_account_id") or "").strip()
        receiver_id = str(tx_data.get("receiver_account_id") or "").strip()
        currency = str(tx_data.get("currency") or "INR").upper().strip()
        channel = str(tx_data.get("channel") or "WIRE").upper().strip()
        ip_country = str(tx_data.get("ip_country") or "IN").upper().strip()
        location = str(tx_data.get("location") or "Mumbai, IN").strip()
        
        # --- 1. DATA INTEGRITY CHECKS ---
        # 1.1 Required Fields
        if not sender_id or not receiver_id:
            integrity_errors.append({
                "rule_id": "RULE-INT-001",
                "field": "sender_account_id / receiver_account_id",
                "message": "Both sender and receiver account identifiers are strictly mandatory.",
            })

        # 1.2 Amount validation
        amount_val = tx_data.get("amount")
        amount = 0.0
        try:
            if amount_val is None or str(amount_val).strip() == "":
                integrity_errors.append({
                    "rule_id": "RULE-INT-002",
                    "field": "amount",
                    "message": "Transaction amount is missing.",
                })
            else:
                # Handle possible string formatting like "₹ 1,50,000" or "$100"
                cleaned = str(amount_val).replace("₹", "").replace("$", "").replace(",", "").strip()
                amount = float(cleaned)
                if amount <= 0:
                    integrity_errors.append({
                        "rule_id": "RULE-INT-002",
                        "field": "amount",
                        "message": f"Non-positive transaction amount ({amount}) violates financial ledger rules.",
                    })
        except (ValueError, TypeError):
            integrity_errors.append({
                "rule_id": "RULE-INT-002",
                "field": "amount",
                "message": f"Malformed or non-numeric amount value: '{amount_val}'.",
            })

        # 1.3 Self-transfer check
        if sender_id and receiver_id and sender_id == receiver_id:
            integrity_errors.append({
                "rule_id": "RULE-INT-006",
                "field": "receiver_account_id",
                "message": "Sender and receiver cannot be the identical account identifier.",
            })

        # 1.4 Currency validation
        if currency != "INR":
            if currency not in {"USD", "EUR", "GBP", "SGD", "AED"}:
                integrity_errors.append({
                    "rule_id": "RULE-INT-004",
                    "field": "currency",
                    "message": f"Unsupported ISO currency code '{currency}'. Supported: INR, USD, EUR, GBP, SGD, AED.",
                })
            else:
                warnings.append(f"Foreign currency '{currency}' provided. Base settlement standard is INR.")

        # 1.5 Duplicate Transaction ID check
        if tx_id:
            if existing_tx_ids and tx_id in existing_tx_ids:
                integrity_errors.append({
                    "rule_id": "RULE-INT-005",
                    "field": "transaction_id",
                    "message": f"Duplicate transaction ID '{tx_id}' detected in incoming batch.",
                })
            elif db is not None:
                existing_in_db = db.scalar(
                    select(Transaction.id).where(Transaction.transaction_id == tx_id).limit(1)
                )
                if existing_in_db:
                    integrity_errors.append({
                        "rule_id": "RULE-INT-005",
                        "field": "transaction_id",
                        "message": f"Transaction ID '{tx_id}' already exists in ledger database.",
                    })

        # 1.6 Timestamp parse / validation
        raw_ts = tx_data.get("timestamp")
        parsed_ts = datetime.now(timezone.utc)
        if raw_ts:
            if isinstance(raw_ts, datetime):
                parsed_ts = raw_ts if raw_ts.tzinfo else raw_ts.replace(tzinfo=timezone.utc)
            elif isinstance(raw_ts, str):
                try:
                    # Try isoformat or common date strings
                    clean_ts = raw_ts.replace("Z", "+00:00")
                    parsed_ts = datetime.fromisoformat(clean_ts)
                    if not parsed_ts.tzinfo:
                        parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
                except Exception:
                    try:
                        parsed_ts = datetime.strptime(raw_ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
                    except Exception:
                        warnings.append(f"Unable to parse timestamp '{raw_ts}', defaulted to current UTC.")
            
            # Check far future date (> 24 hours)
            now_utc = datetime.now(timezone.utc)
            if parsed_ts > (now_utc + timedelta(hours=24)):
                integrity_errors.append({
                    "rule_id": "RULE-INT-003",
                    "field": "timestamp",
                    "message": f"Transaction timestamp '{raw_ts}' is set > 24 hours into the future.",
                })

        # If severe integrity errors exist, transaction is invalid
        if integrity_errors:
            return {
                "is_valid": False,
                "integrity_errors": integrity_errors,
                "data_quality_warnings": warnings,
                "risk_score": 100,
                "risk_level": "critical",
                "recommended_action": "reject",
                "rules_triggered": [
                    {
                        "rule_id": err["rule_id"],
                        "name": "Data Integrity Rejection",
                        "severity": "critical",
                        "contribution": 100,
                        "description": err["message"],
                        "category": "integrity",
                    }
                    for err in integrity_errors
                ],
                "features": {
                    "amount": amount,
                    "currency": currency,
                    "sender_account_id": sender_id,
                    "receiver_account_id": receiver_id,
                },
                "evaluated_at": datetime.now(timezone.utc).isoformat(),
                "engine_version": ENGINE_VERSION,
            }

        # --- 2. BEHAVIORAL & RISK EVALUATION ---
        score = 0

        # RULE-BEH-001: Structuring / Smurfing Threshold Evasion (near INR 10 Lakh CTR limit)
        if (950000 <= amount <= 999999) or (9500 <= amount <= 9990):
            weight = 45
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-BEH-001",
                "name": "Structuring / Smurfing Evasion",
                "severity": "critical",
                "contribution": weight,
                "description": f"Transfer amount of ₹{amount:,.2f} closely benchmarks statutory reporting limit (evading ₹10,00,000 CTR mandate).",
                "category": "behavioral",
            })

        # RULE-BEH-002: Severe Amount Outlier (> ₹50 Lakh critical or > ₹10 Lakh high)
        if amount >= 5000000:
            weight = 40
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-BEH-002",
                "name": "Extreme High-Value Transfer",
                "severity": "critical",
                "contribution": weight,
                "description": f"Transaction of ₹{amount:,.2f} exceeds ₹50,00,000 threshold, requiring enhanced due diligence.",
                "category": "behavioral",
            })
        elif amount > 1000000:
            weight = 30
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-BEH-002",
                "name": "High-Value Transfer Exceeding ₹10 Lakhs",
                "severity": "high",
                "contribution": weight,
                "description": f"Transaction of ₹{amount:,.2f} crosses statutory threshold of ₹10,00,000.",
                "category": "behavioral",
            })

        # RULE-BEH-003: High Velocity Burst (>= 3 recent txns from same sender within 15 min)
        if db is not None and sender_id:
            window_start = parsed_ts - timedelta(minutes=15)
            recent_count = db.scalar(
                select(func.count(Transaction.id)).where(
                    and_(
                        Transaction.sender_account_id == sender_id,
                        Transaction.timestamp >= window_start,
                    )
                )
            ) or 0
            if recent_count >= 3:
                weight = 35
                score += weight
                rules_triggered.append({
                    "rule_id": "RULE-BEH-003",
                    "name": "Rapid Velocity Burst",
                    "severity": "high",
                    "contribution": weight,
                    "description": f"Sender account '{sender_id}' dispatched {recent_count} transfers within the last 15 minutes.",
                    "category": "behavioral",
                })

        # RULE-BEH-004: High Risk Channel / Gateway
        if channel in HIGH_RISK_CHANNELS:
            weight = 25
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-BEH-004",
                "name": "High-Risk Channel / Unregulated Gateway",
                "severity": "medium",
                "contribution": weight,
                "description": f"Payment channel '{channel}' flagged as high-risk or unregulated transfer vector.",
                "category": "behavioral",
            })

        # --- 3. NETWORK & AML TOPOLOGY RULES ---
        # RULE-AML-001: Known Circular Money Laundering Ring
        if sender_id in KNOWN_CIRCULAR_RING and receiver_id in KNOWN_CIRCULAR_RING:
            weight = 48
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-AML-001",
                "name": "Identified Circular Layering Ring",
                "severity": "critical",
                "contribution": weight,
                "description": f"Counterparties '{sender_id}' & '{receiver_id}' belong to high-priority closed circular layering ring.",
                "category": "network",
            })
        elif db is not None and sender_id and receiver_id:
            # Check bilateral round-trip cycle A -> B then B -> A within 24h
            day_window = parsed_ts - timedelta(hours=24)
            reverse_tx = db.scalar(
                select(Transaction.id).where(
                    and_(
                        Transaction.sender_account_id == receiver_id,
                        Transaction.receiver_account_id == sender_id,
                        Transaction.timestamp >= day_window,
                    )
                ).limit(1)
            )
            if reverse_tx:
                weight = 32
                score += weight
                rules_triggered.append({
                    "rule_id": "RULE-AML-001",
                    "name": "Bilateral Round-Trip Flow",
                    "severity": "high",
                    "contribution": weight,
                    "description": f"Bilateral reverse transfer detected between '{receiver_id}' and '{sender_id}' within 24 hours.",
                    "category": "network",
                })

        # RULE-AML-002: Mule Fan-In / Collector Aggregation Node
        if db is not None and receiver_id:
            mule_window = parsed_ts - timedelta(hours=2)
            distinct_senders = db.scalar(
                select(func.count(func.distinct(Transaction.sender_account_id))).where(
                    and_(
                        Transaction.receiver_account_id == receiver_id,
                        Transaction.timestamp >= mule_window,
                    )
                )
            ) or 0
            if distinct_senders >= 3:
                weight = 32
                score += weight
                rules_triggered.append({
                    "rule_id": "RULE-AML-002",
                    "name": "Mule Collector / Fan-In Aggregation",
                    "severity": "high",
                    "contribution": weight,
                    "description": f"Receiver account '{receiver_id}' accumulated incoming funds from {distinct_senders} distinct senders within 2 hours.",
                    "category": "network",
                })

        # RULE-AML-004: Sanctioned / Secrecy Jurisdiction
        if ip_country in HIGH_RISK_JURISDICTIONS:
            weight = 40
            score += weight
            rules_triggered.append({
                "rule_id": "RULE-AML-004",
                "name": "FATF / High-Risk Secrecy Jurisdiction",
                "severity": "critical",
                "contribution": weight,
                "description": f"Origin IP or beneficiary country code '{ip_country}' matches international high-risk sanctions monitoring list.",
                "category": "aml",
            })

        # --- 4. ML ANOMALY INFERENCE & ENSEMBLE SCORING ---
        try:
            from app.ml.ml_engine import ml_engine
        except ImportError:
            from backend.app.ml.ml_engine import ml_engine
        ml_res = ml_engine.predict_anomaly(tx_data)
        
        # If ML flagged significant statistical anomaly, record as explainable signal
        if ml_res.get("is_anomaly") and ml_res.get("anomaly_score", 0) >= 60:
            ml_weight = int(ml_res["anomaly_score"] * 0.35)
            score += ml_weight
            rules_triggered.append({
                "rule_id": "RULE-ML-001",
                "name": "Isolation Forest Anomaly Detection",
                "severity": "high" if ml_res["anomaly_score"] >= 75 else "medium",
                "contribution": ml_weight,
                "description": f"Statistical outlier detected by {ml_res['model_name']} (Score: {ml_res['anomaly_score']}/100, Confidence: {ml_res['confidence']}).",
                "category": "ml",
            })

        # --- 5. SCORE NORMALIZATION & ACTION SELECTION ---
        final_score = min(100, max(0, score))
        if not rules_triggered:
            # Baseline low risk score for ordinary retail transfer
            final_score = min(25, int(amount % 20) + 5)
            risk_level = "low"
            recommended_action = "allow"
        else:
            if final_score >= 85:
                risk_level = "critical"
                recommended_action = "block"
            elif final_score >= 65:
                risk_level = "high"
                recommended_action = "review"
            elif final_score >= 35:
                risk_level = "medium"
                recommended_action = "review"
            else:
                risk_level = "low"
                recommended_action = "allow"

        return {
            "is_valid": True,
            "integrity_errors": [],
            "data_quality_warnings": warnings,
            "risk_score": final_score,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "rules_triggered": rules_triggered,
            "ml_assessment": ml_res,
            "features": {
                "amount": amount,
                "currency": currency,
                "sender_account_id": sender_id,
                "receiver_account_id": receiver_id,
                "channel": channel,
                "ip_country": ip_country,
                "location": location,
            },
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "engine_version": ENGINE_VERSION,
        }



def screen_and_gate_transaction(
    db: Session,
    tx_data: dict[str, Any],
    actor_user_id: int | None = None,
    source: str = "manual_entry",
    commit: bool = True,
    import_id: str | None = None,
) -> tuple[dict[str, Any], Transaction | None]:
    """
    Central Pre-Ingestion Gate:
    1. Screen transaction using FraudRiskEngine
    2. If invalid or rejected -> do not commit; return screening assessment
    3. If valid and commit=True:
       - Persist Transaction
       - Persist ScreeningAssessment
       - Persist AuditEvent
       - Commit atomic DB transaction
    """
    screening_result = FraudRiskEngine.evaluate(db, tx_data)

    if not screening_result["is_valid"]:
        return screening_result, None

    if not commit:
        return screening_result, None

    # Determine status & screening_status
    action = screening_result["recommended_action"]
    risk_level = screening_result["risk_level"]

    if action == "block":
        screening_status = "quarantined"
        tx_status = "blocked"
        final_action = "blocked"
    elif action == "review":
        screening_status = "pending_review"
        tx_status = "held"
        final_action = "held"
    else:
        screening_status = "accepted"
        tx_status = "settled"
        final_action = "allowed"

    raw_ts = tx_data.get("timestamp")
    parsed_ts = datetime.now(timezone.utc)
    if isinstance(raw_ts, datetime):
        parsed_ts = raw_ts if raw_ts.tzinfo else raw_ts.replace(tzinfo=timezone.utc)
    elif isinstance(raw_ts, str) and raw_ts:
        try:
            parsed_ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        except Exception:
            pass

    import secrets
    tx_id = tx_data.get("transaction_id") or f"TX-2026-{secrets.token_hex(4).upper()}"

    tx = Transaction(
        transaction_id=tx_id,
        sender_account_id=tx_data.get("sender_account_id"),
        receiver_account_id=tx_data.get("receiver_account_id"),
        sender_name=tx_data.get("sender_name") or tx_data.get("sender_account_id"),
        receiver_name=tx_data.get("receiver_name") or tx_data.get("receiver_account_id"),
        amount=float(tx_data.get("amount", 0.0)),
        currency=str(tx_data.get("currency", "INR")).upper(),
        timestamp=parsed_ts,
        channel=tx_data.get("channel") or "WIRE",
        device_id=tx_data.get("device_id") or tx_data.get("device_fingerprint") or f"fp_{secrets.token_hex(4)}",
        location=tx_data.get("location") or "Mumbai, IN",
        status=tx_status,
        screening_status=screening_status,
        risk_score=screening_result["risk_score"],
        risk_level=risk_level,
        recommended_action=action,
        risk_factors=screening_result["rules_triggered"],
        import_id=import_id,
    )
    db.add(tx)

    # Screening assessment persistence
    assessment_id = f"SA-{secrets.token_hex(6).upper()}"
    assessment = ScreeningAssessment(
        assessment_id=assessment_id,
        transaction_id=tx.transaction_id,
        source=source,
        risk_score=screening_result["risk_score"],
        risk_level=risk_level,
        recommended_action=action,
        final_action=final_action,
        rules_triggered=screening_result["rules_triggered"],
        data_quality_warnings=screening_result["data_quality_warnings"],
        engine_version=ENGINE_VERSION,
        actor_user_id=actor_user_id,
        is_latest=True,
        version=1,
    )
    db.add(assessment)

    # Audit event
    db.add(
        AuditEvent(
            actor_user_id=actor_user_id,
            action=f"transaction_screened_{final_action}",
            entity_type="transaction",
            entity_id=tx.transaction_id,
            details={
                "source": source,
                "risk_score": tx.risk_score,
                "risk_level": risk_level,
                "rules_count": len(screening_result["rules_triggered"]),
            },
        )
    )

    db.commit()
    db.refresh(tx)
    return screening_result, tx
