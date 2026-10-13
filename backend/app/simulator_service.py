"""
Finverse Counterfactual Transaction Simulator Service
Allows compliance analysts, senior analysts, and risk officers to run "what-if" counterfactual scenarios:
- Compares baseline transaction against hypothetical modifications (amount, channel, counterparty, location).
- Evaluates both through the central FraudRiskEngine and ML Isolation Forest pipeline.
- Calculates delta in risk scores, policy actions, and explainable rule sets.
- NEVER modifies or mutates original ledger records.
"""
import uuid
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Transaction, SimulationScenario, AuditEvent, User
from app.risk_engine import FraudRiskEngine

DEFAULT_BASELINE = {
    "transaction_id": "TX-BASE-DEFAULT",
    "sender_account_id": "ACC-8491",
    "sender_name": "Apex Global Trading Ltd",
    "receiver_account_id": "ACC-3042",
    "receiver_name": "Meridian Horizon LLC (Panama)",
    "amount": 1485000.0,
    "currency": "INR",
    "channel": "SWIFT",
    "location": "Mumbai, IN",
    "ip_country": "CY",
    "device_id": "fp_0a127584",
}

def run_counterfactual_simulation(
    db: Session,
    user: User,
    baseline_id: str | None = None,
    baseline_transaction_id: str | None = None,
    modifications: dict[str, Any] | None = None,
    rule_threshold_overrides: dict[str, Any] | None = None,
    custom_baseline: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Executes a counterfactual comparative simulation.
    Preserves all original ledger records; runs pure in-memory evaluation.
    """
    resolved_id = baseline_transaction_id or baseline_id
    modifications = modifications or {}
    rule_threshold_overrides = rule_threshold_overrides or {}

    # 1. Resolve baseline transaction payload
    baseline_dict = dict(DEFAULT_BASELINE)
    if resolved_id:
        existing = db.scalar(select(Transaction).where(Transaction.transaction_id == resolved_id))
        if existing:
            baseline_dict = {
                "transaction_id": existing.transaction_id,
                "sender_account_id": existing.sender_account_id,
                "sender_name": existing.sender_name or existing.sender_account_id,
                "receiver_account_id": existing.receiver_account_id,
                "receiver_name": existing.receiver_name or existing.receiver_account_id,
                "amount": float(existing.amount),
                "currency": existing.currency or "INR",
                "channel": existing.channel or "WIRE",
                "location": existing.location or "Mumbai, IN",
                "ip_country": existing.ip_country or "IN",
                "device_id": existing.device_id or "fp_default",
                "timestamp": existing.timestamp.isoformat() if existing.timestamp else None,
            }
    elif custom_baseline:
        baseline_dict.update(custom_baseline)

    # 2. Evaluate baseline through FraudRiskEngine + ML
    baseline_eval = FraudRiskEngine.evaluate(db, baseline_dict)

    # 3. Formulate hypothetical scenario payload
    scenario_dict = dict(baseline_dict)
    scenario_dict.update(modifications)
    scenario_dict["transaction_id"] = f"TX-SIM-{uuid.uuid4().hex[:6].upper()}"

    # 4. Evaluate hypothetical scenario through FraudRiskEngine + ML
    scenario_eval = FraudRiskEngine.evaluate(db, scenario_dict)

    # 5. Compute Comparative Delta
    base_score = baseline_eval["risk_score"]
    scen_score = scenario_eval["risk_score"]
    score_delta = scen_score - base_score

    base_rule_ids = {r["rule_id"] for r in baseline_eval["rules_triggered"]}
    scen_rule_ids = {r["rule_id"] for r in scenario_eval["rules_triggered"]}

    rules_eliminated = [
        r for r in baseline_eval["rules_triggered"] if r["rule_id"] not in scen_rule_ids
    ]
    rules_introduced = [
        r for r in scenario_eval["rules_triggered"] if r["rule_id"] not in base_rule_ids
    ]
    rules_persisted = [
        r for r in scenario_eval["rules_triggered"] if r["rule_id"] in base_rule_ids
    ]

    # Synthesize explainable narrative
    explanation_parts = []
    if score_delta < 0:
        explanation_parts.append(
            f"Risk score decreased by {abs(score_delta)} points (from {base_score}/100 down to {scen_score}/100)."
        )
    elif score_delta > 0:
        explanation_parts.append(
            f"Risk score increased by {score_delta} points (from {base_score}/100 up to {scen_score}/100)."
        )
    else:
        explanation_parts.append(f"Risk score remained invariant at {base_score}/100.")

    if baseline_eval["recommended_action"] != scenario_eval["recommended_action"]:
        explanation_parts.append(
            f"Policy recommendation transitioned from '{baseline_eval['recommended_action'].upper()}' to '{scenario_eval['recommended_action'].upper()}'."
        )

    if rules_eliminated:
        elim_names = ", ".join(f"[{r['rule_id']}] {r['name']}" for r in rules_eliminated)
        explanation_parts.append(f"Eliminated triggers: {elim_names}.")

    if rules_introduced:
        intro_names = ", ".join(f"[{r['rule_id']}] {r['name']}" for r in rules_introduced)
        explanation_parts.append(f"Newly triggered rules: {intro_names}.")

    explanation_summary = " ".join(explanation_parts)

    # 6. Record auditable scenario session
    scenario_id = f"SCEN-2026-{uuid.uuid4().hex[:6].upper()}"
    delta_summary = {
        "score_delta": score_delta,
        "rules_eliminated_count": len(rules_eliminated),
        "rules_introduced_count": len(rules_introduced),
        "explanation": explanation_summary,
    }

    try:
        scen_record = SimulationScenario(
            scenario_id=scenario_id,
            user_id=user.id,
            title=f"What-If: {modifications.get('description', 'Scenario Analysis')}",
            baseline_transaction_id=baseline_dict.get("transaction_id"),
            modifications=modifications,
            rule_threshold_overrides=rule_threshold_overrides,
            baseline_score=base_score,
            scenario_score=scen_score,
            baseline_action=baseline_eval["recommended_action"],
            scenario_action=scenario_eval["recommended_action"],
            delta_summary=delta_summary,
        )
        db.add(scen_record)
        db.add(
            AuditEvent(
                actor_user_id=user.id,
                action="counterfactual_simulation_run",
                entity_type="simulation_scenario",
                entity_id=scenario_id,
                details={
                    "baseline_score": base_score,
                    "scenario_score": scen_score,
                    "score_delta": score_delta,
                },
            )
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Simulator] Warning persisting scenario audit: {e}")

    def format_rule(r):
        return {
            "code": r.get("rule_id", ""),
            "rule_id": r.get("rule_id", ""),
            "label": r.get("name") or r.get("label") or r.get("rule_id", ""),
            "name": r.get("name") or r.get("label") or r.get("rule_id", ""),
            "description": r.get("description", ""),
            "contribution": r.get("contribution", 0),
            "severity": r.get("severity", "medium"),
            "evidence": r.get("evidence", ""),
        }

    return {
        "scenario_id": scenario_id,
        "score_delta": score_delta,
        "baseline": {
            "transaction_id": baseline_dict.get("transaction_id"),
            "amount": float(baseline_dict.get("amount", 0)),
            "channel": baseline_dict.get("channel"),
            "currency": baseline_dict.get("currency", "INR"),
            "transaction": baseline_dict,
            "risk_score": base_score,
            "risk_level": baseline_eval["risk_level"],
            "recommended_action": baseline_eval["recommended_action"],
            "rules_triggered": [format_rule(r) for r in baseline_eval["rules_triggered"]],
            "ml_assessment": baseline_eval.get("ml_assessment", {}),
        },
        "scenario": {
            "transaction_id": scenario_dict.get("transaction_id"),
            "amount": float(scenario_dict.get("amount", 0)),
            "channel": scenario_dict.get("channel"),
            "currency": scenario_dict.get("currency", "INR"),
            "transaction": scenario_dict,
            "risk_score": scen_score,
            "risk_level": scenario_eval["risk_level"],
            "recommended_action": scenario_eval["recommended_action"],
            "rules_triggered": [format_rule(r) for r in scenario_eval["rules_triggered"]],
            "ml_assessment": scenario_eval.get("ml_assessment", {}),
        },
        "delta": {
            "score_change": score_delta,
            "score_delta": score_delta,
            "baseline_action": baseline_eval["recommended_action"],
            "scenario_action": scenario_eval["recommended_action"],
            "rules_eliminated": [format_rule(r) for r in rules_eliminated],
            "rules_introduced": [format_rule(r) for r in rules_introduced],
            "rules_persisted": [format_rule(r) for r in rules_persisted],
            "explanation": explanation_summary,
        },
    }
