import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import Base, engine, SessionLocal, ensure_schema_compatibility
from app.services import seed_if_empty
from app.models import AuthChallenge
from sqlalchemy import select, desc

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

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_login_and_2fa_flow(client):
    # Step 1: Login with 2FA enabled account
    res = client.post("/api/auth/login", json={"email": "analyst@finverse.io", "password": "Finverse@2025"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "two_factor_required"
    challenge_id = data["challenge_id"]
    assert challenge_id is not None

    # Step 2: Login with Demo Analyst (2FA disabled)
    res_demo = client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    assert res_demo.status_code == 200
    assert res_demo.json()["status"] == "authenticated"
    assert "finverse_session" in client.cookies

    # Step 3: Access /api/auth/me
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 200
    user = res_me.json()
    assert user["email"] == "demo@finverse.io"
    assert user["name"] == "Demo Analyst"

def test_dashboard_summary(client):
    # Ensure logged in
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_transactions" in data
    assert "high_risk_alerts" in data
    assert "cases_under_investigation" in data
    assert data["currency"] == "INR"
    assert len(data["risk_distribution"]) == 4
    assert len(data["decisions_breakdown"]) == 4

def test_transactions_list_and_details(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res = client.get("/api/transactions?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] > 0
    first_tx = data["items"][0]
    tx_id = first_tx["transaction_id"]
    assert first_tx["currency"] == "INR"

    # Detail
    res_detail = client.get(f"/api/transactions/{tx_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["transaction_id"] == tx_id
    assert "explanation" in detail

    # Assessment
    res_assess = client.get(f"/api/transactions/{tx_id}/assessment")
    assert res_assess.status_code == 200
    assert res_assess.json()["transaction_id"] == tx_id

def test_transaction_decision(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res = client.get("/api/transactions?limit=1")
    tx_id = res.json()["items"][0]["transaction_id"]

    res_dec = client.post(
        f"/api/transactions/{tx_id}/decision",
        json={"action": "step_up_verification", "reason": "Requires customer SMS confirmation"}
    )
    assert res_dec.status_code == 200
    assert res_dec.json()["recommended_action"] == "step_up_verification"

def test_network_graph(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

    # Query with specific account
    acc_id = data["nodes"][0]["id"]
    res_acc = client.get(f"/api/network/{acc_id}")
    assert res_acc.status_code == 200
    assert len(res_acc.json()["nodes"]) > 0

def test_cases_crud(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    # List cases
    res = client.get("/api/cases")
    assert res.status_code == 200
    cases = res.json()["items"]
    assert len(cases) > 0

    # Create new case
    new_case_payload = {
        "title": "Layering Investigation via Test Suite",
        "case_type": "aml_structuring",
        "severity": "high",
        "assigned_to": "Sarah Chen (Lead AML)",
        "related_accounts": ["ACC-8491", "ACC-3042"],
        "related_transaction_ids": ["TX-2026-98104"],
        "summary": "Automated verification test case"
    }
    res_create = client.post("/api/cases", json=new_case_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    cid = created["case_id"]
    assert created["title"] == new_case_payload["title"]

    # Add note
    res_note = client.post(f"/api/cases/{cid}/notes", json={"text": "Subpoena notice served."})
    assert res_note.status_code == 200
    assert len(res_note.json()["notes"]) >= 1

    # Update case status
    res_up = client.patch(f"/api/cases/{cid}", json={"status": "in_review", "severity": "critical"})
    assert res_up.status_code == 200
    assert res_up.json()["status"] == "in_review"
    assert res_up.json()["severity"] == "critical"

def test_analytics_metrics(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res = client.get("/api/analytics/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["is_synthetic"] is True
    assert "precision" in data
    assert "confusion_matrix" in data

def test_simulation_toggle(client):
    client.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    res_start = client.post("/api/simulation/start", json={"interval_seconds": 5})
    assert res_start.status_code == 200
    assert res_start.json()["status"] in ["started", "running"]

    res_stop = client.post("/api/simulation/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["status"] == "stopped"
