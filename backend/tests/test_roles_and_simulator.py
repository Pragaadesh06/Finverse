import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine, SessionLocal, ensure_schema_compatibility
from app.services import seed_if_empty
from app.models import Transaction, User
from sqlalchemy import select

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    ensure_schema_compatibility()
    with SessionLocal() as db:
        seed_if_empty(db)
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_customer_isolation_and_forbidden_routes(client):
    # Log in as Customer
    login_res = client.post("/api/auth/login", json={"email": "customer@finverse.io", "password": "demo"})
    assert login_res.status_code == 200
    assert login_res.json()["status"] == "authenticated"
    assert login_res.json()["user"]["role"] == "customer"

    # 1. Customer MUST NOT access institutional dashboard
    res_dash = client.get("/api/dashboard/summary")
    assert res_dash.status_code == 403
    assert "Access denied" in res_dash.json()["detail"]

    # 2. Customer MUST NOT access institutional transaction monitor
    res_txs = client.get("/api/transactions")
    assert res_txs.status_code == 403

    # 3. Customer MUST NOT access case management
    res_cases = client.get("/api/cases")
    assert res_cases.status_code == 403

    # 4. Customer MUST NOT access AML network explorer
    res_net = client.get("/api/network")
    assert res_net.status_code == 403

    # 5. Customer MUST NOT access counterfactual simulator
    res_sim = client.post("/api/simulator/counterfactual", json={
        "baseline_transaction_id": "TX-2026-98104",
        "modifications": {"amount": 50000}
    })
    assert res_sim.status_code == 403

    # 6. Customer MUST NOT access export center
    res_exp = client.get("/api/reports/preview?report_type=transactions")
    assert res_exp.status_code == 403

def test_customer_portal_authorized_routes(client):
    # Customer session
    client.post("/api/auth/login", json={"email": "customer@finverse.io", "password": "demo"})

    # Overview
    res_overview = client.get("/api/customer/overview")
    assert res_overview.status_code == 200
    ov_data = res_overview.json()
    assert ov_data["account_id"] == "ACC-5120"
    assert "activity_summary" in ov_data
    assert "recent_transactions" in ov_data

    # Customer Transactions (isolated)
    res_cust_tx = client.get("/api/customer/transactions")
    assert res_cust_tx.status_code == 200
    tx_items = res_cust_tx.json()["items"]
    # All transactions must be associated with the customer
    for item in tx_items:
        assert item["account_id"] == "ACC-5120" or item["counterparty_account"] == "ACC-5120"
        # Verify internal risk scores are NOT leaked to the customer
        assert "risk_score" not in item or item.get("risk_score") is None
        assert "risk_factors" not in item

    # Customer Submit Dispute
    res_dispute = client.post("/api/customer/disputes", json={
        "transaction_id": "TX-2026-98103",
        "reason": "unauthorized_charge",
        "description": "I did not authorize this crypto desk debit from my account."
    })
    assert res_dispute.status_code == 201
    disp_data = res_dispute.json()
    assert disp_data["status"] == "submitted"
    assert disp_data["dispute_id"].startswith("DISP-") or disp_data["dispute_id"].startswith("DSP-")
    assert disp_data["case_id"].startswith("CASE-")

    # List disputes
    res_my_disputes = client.get("/api/customer/disputes")
    assert res_my_disputes.status_code == 200
    my_disputes = res_my_disputes.json()["disputes"]
    assert len(my_disputes) >= 1
    assert any(d["transaction_id"] == "TX-2026-98103" for d in my_disputes)

    # Customer Statement Export
    res_export = client.get("/api/customer/export")
    assert res_export.status_code == 200
    assert "text/csv" in res_export.headers.get("content-type", "")
    assert "Reference ID" in res_export.text

def test_senior_analyst_vs_analyst_permissions(client):
    # 1. Standard Analyst session
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    me = client.get("/api/auth/me").json()
    assert me["role"] == "analyst"

    # Standard analyst cannot reassign a case
    res_reassign_fail = client.patch("/api/cases/CASE-2026-101/reassign", json={
        "assigned_to": "Arjun Sharma"
    })
    # Either 403 or 404 (if case id doesn't exist, but permission check happens first)
    assert res_reassign_fail.status_code == 403

    # 2. Senior Analyst session
    with SessionLocal() as db:
        u = db.scalar(select(User).where(User.email == "analyst@finverse.io"))
        u.role = "senior_analyst"
        u.two_factor_enabled = False
        db.commit()

    try:
        login_sr = client.post("/api/auth/login", json={"email": "analyst@finverse.io", "password": "Finverse@2025"})
        assert login_sr.status_code == 200
        assert login_sr.json()["user"]["role"] == "senior_analyst"

        # Get a case to reassign
        cases = client.get("/api/cases").json()["items"]
        assert len(cases) > 0
        target_case_id = cases[0]["case_id"]

        res_reassign = client.patch(f"/api/cases/{target_case_id}/reassign", json={
            "assigned_to": "Elena Rostova (Compliance Lead)"
        })
        assert res_reassign.status_code == 200
        assert res_reassign.json()["assigned_to"] == "Elena Rostova (Compliance Lead)"
    finally:
        with SessionLocal() as db:
            u = db.scalar(select(User).where(User.email == "analyst@finverse.io"))
            u.two_factor_enabled = True
            db.commit()


def test_counterfactual_simulator_and_non_mutation(client):
    # Login as Analyst
    res_l = client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    assert res_l.status_code == 200
    assert res_l.json()["status"] == "authenticated"

    # Check baseline transaction original values
    tx_res = client.get("/api/transactions/TX-2026-98104")
    assert tx_res.status_code == 200
    baseline_tx = tx_res.json()
    orig_amount = baseline_tx["amount"]
    orig_score = baseline_tx["risk_score"]

    # Run Counterfactual Simulation with reduced amount and clean channel
    sim_res = client.post("/api/simulator/counterfactual", json={
        "baseline_transaction_id": "TX-2026-98104",
        "modifications": {
            "amount": 25000.0,
            "channel": "UPI",
            "ip_country": "IN",
            "merchant_category": "Retail Grocery"
        }
    })
    assert sim_res.status_code == 200
    sim_data = sim_res.json()

    assert sim_data["baseline"]["transaction_id"] == "TX-2026-98104"
    assert sim_data["scenario"]["amount"] == 25000.0
    assert "score_delta" in sim_data
    assert "ml_assessment" in sim_data["scenario"]
    assert sim_data["scenario"]["ml_assessment"]["model_version"] == "Finverse-IsoForest-v1.0"

    # CRITICAL: Verify baseline transaction in DB was NOT mutated!
    tx_res_after = client.get("/api/transactions/TX-2026-98104")
    assert tx_res_after.status_code == 200
    baseline_tx_after = tx_res_after.json()
    assert baseline_tx_after["amount"] == orig_amount
    assert baseline_tx_after["risk_score"] == orig_score
    assert baseline_tx_after["channel"] == baseline_tx["channel"]
