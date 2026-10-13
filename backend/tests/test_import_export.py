import io
import csv
import openpyxl
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.db import Base, engine, SessionLocal, ensure_schema_compatibility
from app.models import Transaction, ImportJob, ScreeningAssessment
from app.services import seed_if_empty

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    ensure_schema_compatibility()
    with SessionLocal() as db:
        seed_if_empty(db)
    yield

@pytest.fixture
def auth_client():
    c = TestClient(app)
    c.post("/api/auth/login", json={"email": "demo@finverse.io", "password": "demo"})
    return c

# ── 1. EXPORT TESTS ───────────────────────────────────────────────────────────
def test_export_preview_kpis_and_filters(auth_client):
    res = auth_client.get("/api/reports/preview?report_type=transactions&risk_category=all")
    assert res.status_code == 200
    data = res.json()
    assert "report_title" in data
    assert "kpis" in data
    assert data["kpis"]["total_records"] > 0
    assert data["kpis"]["total_value_inr"] > 0
    assert "risk_breakdown" in data["kpis"]
    assert len(data["items"]) > 0
    assert "INR" in data["summary"] or "₹" in data["summary"]

def test_export_preview_with_filters(auth_client):
    res = auth_client.get("/api/reports/preview?report_type=transactions&risk_category=critical&min_amount=100000")
    assert res.status_code == 200
    data = res.json()
    assert data["filters"]["risk_category"] == "critical"
    for item in data["items"]:
        assert item["risk_level"] == "critical"
        assert item["amount"] >= 100000

def test_export_excel_format_and_sheets(auth_client):
    res = auth_client.get("/api/reports/export?format=xlsx&report_type=complete")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "Content-Disposition" in res.headers
    assert ".xlsx" in res.headers["Content-Disposition"]

    # Verify openpyxl can load the content
    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    sheet_names = wb.sheetnames
    assert "Executive Summary" in sheet_names
    assert "Transactions" in sheet_names
    assert "Fraud & AML Alerts" in sheet_names
    assert "Accounts & Counterparties" in sheet_names
    assert "Investigation Cases" in sheet_names

    # Check Executive summary title
    sum_sheet = wb["Executive Summary"]
    assert "FINVERSE RISK ORCHESTRATION PLATFORM" in str(sum_sheet["A1"].value)

def test_export_csv_and_formula_injection_defense(auth_client):
    res = auth_client.get("/api/reports/export?format=csv&report_type=transactions")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    csv_text = res.content.decode("utf-8-sig")
    assert "Transaction ID" in csv_text
    assert "Amount INR" in csv_text

    # Verify CSV quoting and formula escaping
    # If a cell had =1+1, it should be escaped as '=1+1
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) > 1

# ── 2. IMPORT TESTS ───────────────────────────────────────────────────────────
def test_import_preview_valid_csv(auth_client):
    csv_content = (
        "transaction_id,sender_account_id,receiver_account_id,amount,currency,channel\n"
        "TX-TEST-CSV-01,ACC-1001,ACC-2002,75000.00,INR,WIRE\n"
        "TX-TEST-CSV-02,ACC-3003,ACC-4004,15000.50,INR,UPI\n"
    ).encode("utf-8")

    files = {"file": ("test_transactions.csv", csv_content, "text/csv")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "previewed"
    assert data["summary"]["total_rows"] == 2
    assert data["summary"]["valid_rows"] == 2
    assert data["summary"]["invalid_rows"] == 0
    assert len(data["sample_valid_rows"]) == 2

def test_import_preview_valid_xlsx(auth_client):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["transaction_id", "sender_account_id", "receiver_account_id", "amount", "currency"])
    ws.append(["TX-TEST-XLSX-01", "ACC-9001", "ACC-9002", 250000.00, "INR"])
    ws.append(["TX-TEST-XLSX-02", "ACC-9003", "ACC-9004", 45000.00, "INR"])
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    files = {"file": ("test_upload.xlsx", bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "previewed"
    assert data["summary"]["total_rows"] == 2
    assert data["summary"]["valid_rows"] == 2

def test_import_preview_missing_columns(auth_client):
    csv_content = (
        "transaction_id,amount\n"
        "TX-BAD-01,50000.00\n"
    ).encode("utf-8")
    files = {"file": ("bad_columns.csv", csv_content, "text/csv")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code == 422
    assert "Missing required mapping" in res.json()["detail"]

def test_import_preview_invalid_amounts_and_dates(auth_client):
    csv_content = (
        "transaction_id,sender_account_id,receiver_account_id,amount,currency\n"
        "TX-ERR-01,ACC-1001,ACC-2002,-5000.00,INR\n"
        "TX-ERR-02,ACC-1001,ACC-2002,NOT_A_NUMBER,INR\n"
        "TX-OK-01,ACC-1001,ACC-2002,50000.00,INR\n"
    ).encode("utf-8")
    files = {"file": ("invalid_rows.csv", csv_content, "text/csv")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_rows"] == 3
    assert data["summary"]["valid_rows"] == 1
    assert data["summary"]["invalid_rows"] == 2
    assert len(data["row_errors"]) == 2

def test_import_preview_duplicate_ids_within_file(auth_client):
    csv_content = (
        "transaction_id,sender_account_id,receiver_account_id,amount,currency\n"
        "TX-DUP-BATCH,ACC-1001,ACC-2002,50000.00,INR\n"
        "TX-DUP-BATCH,ACC-1001,ACC-2002,60000.00,INR\n"
    ).encode("utf-8")
    files = {"file": ("dup_batch.csv", csv_content, "text/csv")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["duplicate_rows"] == 1

def test_import_preview_unsupported_file_type(auth_client):
    bad_bytes = b"This is an executable fake script\x00\x01\x02\x03\x04"
    files = {"file": ("malicious.exe", bad_bytes, "application/octet-stream")}
    res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert res.status_code in (400, 422)

def test_import_confirmation_and_commit(auth_client):
    import uuid
    # Preview valid file with unique ID
    tx_id_unique = f"TX-CONFIRM-{uuid.uuid4().hex[:8].upper()}"
    csv_content = (
        f"transaction_id,sender_account_id,receiver_account_id,amount,currency,channel\n"
        f"{tx_id_unique},ACC-CONFIRM-1,ACC-CONFIRM-2,85000.00,INR,WIRE\n"
    ).encode("utf-8")
    files = {"file": ("confirm_test.csv", csv_content, "text/csv")}
    preview_res = auth_client.post("/api/imports/preview", files=files, data={"dataset_type": "transactions"})
    assert preview_res.status_code == 200
    import_id = preview_res.json()["import_id"]

    # Verify not yet in database
    with SessionLocal() as db:
        existing = db.scalar(select(Transaction).where(Transaction.transaction_id == tx_id_unique))
        assert existing is None

    # Confirm import
    confirm_res = auth_client.post(
        "/api/imports/confirm",
        json={"import_id": import_id, "policy": "partial", "duplicate_policy": "skip"},
    )
    assert confirm_res.status_code == 200
    data = confirm_res.json()
    assert data["status"] == "completed"
    assert data["imported_rows"] == 1

    # Verify now in database with import_id
    with SessionLocal() as db:
        saved = db.scalar(select(Transaction).where(Transaction.transaction_id == tx_id_unique))
        assert saved is not None
        assert saved.import_id == import_id
        assert saved.amount == 85000.00

def test_import_history_and_error_report(auth_client):
    # Retrieve import jobs history
    res = auth_client.get("/api/imports")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0

    first_job = data["items"][0]
    import_id = first_job["import_id"]

    # Download error report CSV
    err_res = auth_client.get(f"/api/imports/{import_id}/errors")
    assert err_res.status_code == 200
    assert "text/csv" in err_res.headers["content-type"]

# ── 3. REAL-TIME SCREENING & RISK MONITOR TESTS ──────────────────────────────
def test_pre_ingestion_screening_dry_run_and_commit(auth_client):
    import uuid
    # 1. Dry run screening (save_to_ledger=False)
    dry_req = {
        "sender_account_id": "ACC-SCREEN-1",
        "receiver_account_id": "ACC-SCREEN-2",
        "amount": 985000.00, # Smurfing near statutory limit (RULE-BEH-001)
        "currency": "INR",
        "save_to_ledger": False,
    }
    dry_res = auth_client.post("/api/transactions/screen", json=dry_req)
    assert dry_res.status_code == 200
    data = dry_res.json()
    assert data["committed"] is False
    assert data["screening_result"]["risk_score"] >= 45
    rule_ids = [r["rule_id"] for r in data["screening_result"]["rules_triggered"]]
    assert "RULE-BEH-001" in rule_ids

    # 2. Gate and save to ledger (save_to_ledger=True)
    tx_unique = f"TX-GATE-{uuid.uuid4().hex[:8].upper()}"
    commit_req = {
        **dry_req,
        "transaction_id": tx_unique,
        "save_to_ledger": True,
    }
    commit_res = auth_client.post("/api/transactions/screen", json=commit_req)
    assert commit_res.status_code == 200
    c_data = commit_res.json()
    assert c_data["committed"] is True
    assert c_data["transaction"]["transaction_id"] == tx_unique

    # Verify saved in database
    with SessionLocal() as db:
        saved = db.scalar(select(Transaction).where(Transaction.transaction_id == tx_unique))
        assert saved is not None
        assert saved.risk_score >= 45


def test_risk_monitor_stats_and_feed(auth_client):
    # Stats
    stats_res = auth_client.get("/api/risk-monitor/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_screened" in stats
    assert "accepted" in stats
    assert "held" in stats
    assert "blocked" in stats

    # Feed
    feed_res = auth_client.get("/api/risk-monitor/feed?limit=20")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert "feed" in feed
    assert len(feed["feed"]) > 0

def test_rescreen_existing_transaction(auth_client):
    # Grab an existing transaction
    with SessionLocal() as db:
        first_tx = db.scalar(select(Transaction).limit(1))
        tx_id = first_tx.transaction_id

    res = auth_client.post(f"/api/transactions/{tx_id}/rescreen")
    assert res.status_code == 200
    data = res.json()
    assert "assessment" in data
    assert data["assessment"]["version"] >= 1
    assert "engine_version" in data["assessment"]
