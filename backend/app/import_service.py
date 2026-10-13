"""
Finverse Financial Data Import Service
Handles:
1. Secure parsing of .xlsx (openpyxl data_only=True) and .csv with magic-byte validation & 10MB limits.
2. Auto-column mapping to Finverse Transaction schema.
3. Row-level validation and pre-screening using FraudRiskEngine.
4. Import job lifecycle (preview -> confirmation -> commit -> error report download).
"""
import io
import csv
import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
from fastapi import UploadFile, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
import openpyxl

from app.models import ImportJob, Transaction, ScreeningAssessment, AuditEvent, User
from app.risk_engine import FraudRiskEngine, screen_and_gate_transaction

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 # 10 MB
MAX_ROW_LIMIT = 10000

# Canonical Finverse Transaction Fields
TARGET_FIELDS = {
    "transaction_id": ["transaction_id", "tx_id", "txn_id", "id", "reference_id", "ref_no"],
    "sender_account_id": ["sender_account_id", "sender_account", "from_account", "sender", "debit_account", "source_account"],
    "receiver_account_id": ["receiver_account_id", "receiver_account", "to_account", "receiver", "credit_account", "beneficiary_account", "destination_account"],
    "amount": ["amount", "txn_amount", "transaction_amount", "value", "sum"],
    "currency": ["currency", "curr", "ccy"],
    "timestamp": ["timestamp", "date", "tx_date", "time", "created_at", "datetime"],
    "sender_name": ["sender_name", "from_name", "remitter_name", "debtor_name"],
    "receiver_name": ["receiver_name", "to_name", "beneficiary_name", "creditor_name"],
    "channel": ["channel", "payment_channel", "method", "payment_method", "type"],
    "location": ["location", "city", "country", "geo"],
    "device_id": ["device_id", "device_fingerprint", "device", "ip_address"],
}

def guess_column_mapping(headers: list[str]) -> dict[str, str]:
    """
    Given a list of header strings from uploaded file, auto-detect matching target fields.
    Returns: dict mapping target_field -> source_header
    """
    mapping: dict[str, str] = {}
    normalized = {h.lower().strip().replace(" ", "_").replace("-", "_"): h for h in headers}

    for target_key, candidate_names in TARGET_FIELDS.items():
        for candidate in candidate_names:
            if candidate in normalized:
                mapping[target_key] = normalized[candidate]
                break

    return mapping

def validate_file_bytes(content: bytes, filename: str) -> str:
    """
    Verify magic bytes and file limits.
    Returns file format: 'xlsx' or 'csv'.
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, f"File exceeds maximum permissible size of 10 MB ({len(content)} bytes).")
    
    if len(content) < 4:
        raise HTTPException(400, "File is empty or corrupted.")

    # Check for XLSX (ZIP container magic bytes: PK\x03\x04)
    if content[:4] == b"PK\x03\x04":
        return "xlsx"

    # Check for CSV: verify text-decodable and without null bytes
    try:
        sample = content[:4096].decode("utf-8-sig")
        if "\x00" in sample:
            raise HTTPException(400, "File contains null bytes or binary data; not a valid CSV.")
        return "csv"
    except UnicodeDecodeError:
        try:
            sample = content[:4096].decode("latin-1")
            if "\x00" in sample:
                raise HTTPException(400, "File contains null bytes or binary data; not a valid CSV.")
            return "csv"
        except Exception:
            raise HTTPException(400, "Unsupported file signature. Upload a valid XLSX or CSV file.")


def parse_file_to_rows(content: bytes, file_format: str) -> tuple[list[str], list[dict[str, Any]]]:
    """
    Extracts headers and raw rows from XLSX or CSV.
    Uses data_only=True for openpyxl so formulas evaluate to cached values and are not executed.
    """
    headers: list[str] = []
    raw_rows: list[dict[str, Any]] = []

    if file_format == "xlsx":
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        sheet = wb.active
        if sheet is None:
            raise HTTPException(400, "Excel workbook contains no readable sheets.")

        row_generator = sheet.iter_rows(values_only=True)
        try:
            first_row = next(row_generator)
            headers = [str(cell).strip() if cell is not None else f"Column_{i+1}" for i, cell in enumerate(first_row)]
        except StopIteration:
            raise HTTPException(400, "Excel sheet is empty.")

        row_idx = 2
        for r in row_generator:
            if not any(r):
                continue
            row_dict = {}
            for col_idx, cell_val in enumerate(r):
                if col_idx < len(headers):
                    row_dict[headers[col_idx]] = cell_val
            row_dict["_row_number"] = row_idx
            raw_rows.append(row_dict)
            row_idx += 1
            if len(raw_rows) > MAX_ROW_LIMIT:
                raise HTTPException(400, f"File exceeds maximum permissible limit of {MAX_ROW_LIMIT:,} rows.")

    else:
        # CSV
        text_content = ""
        try:
            text_content = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            text_content = content.decode("latin-1")

        f = io.StringIO(text_content)
        reader = csv.reader(f)
        try:
            raw_headers = next(reader)
            headers = [h.strip() if h.strip() else f"Column_{i+1}" for i, h in enumerate(raw_headers)]
        except StopIteration:
            raise HTTPException(400, "CSV file is empty.")

        row_idx = 2
        for r in reader:
            if not any(r):
                continue
            row_dict = {}
            for col_idx, cell_val in enumerate(r):
                if col_idx < len(headers):
                    row_dict[headers[col_idx]] = cell_val
            row_dict["_row_number"] = row_idx
            raw_rows.append(row_dict)
            row_idx += 1
            if len(raw_rows) > MAX_ROW_LIMIT:
                raise HTTPException(400, f"File exceeds maximum permissible limit of {MAX_ROW_LIMIT:,} rows.")

    return headers, raw_rows


def process_import_preview(
    db: Session,
    content: bytes,
    filename: str,
    user_id: int,
    dataset_type: str = "transactions",
    custom_mapping: dict[str, str] | None = None,
) -> dict[str, Any]:
    """
    Validates, maps, pre-screens all rows, and registers an ImportJob in 'previewed' state.
    """
    if dataset_type != "transactions":
        raise HTTPException(
            400,
            f"Dataset type '{dataset_type}' is not supported for ledger ingestion. Finverse currently requires 'transactions'."
        )

    file_format = validate_file_bytes(content, filename)
    headers, raw_rows = parse_file_to_rows(content, file_format)

    if not raw_rows:
        raise HTTPException(400, "Uploaded file contains headers but no data records.")

    # Determine Column Mapping
    mapping = custom_mapping or guess_column_mapping(headers)

    # Check that minimum required target fields have mappings
    for req in ("sender_account_id", "receiver_account_id", "amount"):
        if req not in mapping or not mapping[req]:
            raise HTTPException(
                422,
                f"Missing required mapping for field '{req}'. Uploaded headers: {headers}"
            )

    # Validate and pre-screen rows
    valid_rows: list[dict[str, Any]] = []
    invalid_rows: list[dict[str, Any]] = []
    duplicate_rows: list[dict[str, Any]] = []
    held_rows: list[dict[str, Any]] = []
    
    seen_tx_ids: set[str] = set()
    
    # Pre-fetch existing DB IDs if provided in file
    candidate_ids = []
    for r in raw_rows:
        t_id_val = r.get(mapping.get("transaction_id", ""))
        if t_id_val:
            candidate_ids.append(str(t_id_val).strip())
    
    existing_in_db: set[str] = set()
    if candidate_ids:
        # Check existing in chunks
        q = select(Transaction.transaction_id).where(Transaction.transaction_id.in_(candidate_ids[:1000]))
        existing_in_db = set(db.scalars(q).all())

    all_row_reports: list[dict[str, Any]] = []

    for r in raw_rows:
        row_num = r.get("_row_number", 0)
        
        # Build normalized transaction payload from mapping
        tx_data = {
            "transaction_id": str(r.get(mapping.get("transaction_id", "")) or f"TX-IMP-{row_num}-{secrets.token_hex(3).upper()}").strip(),
            "sender_account_id": str(r.get(mapping.get("sender_account_id", "")) or "").strip(),
            "receiver_account_id": str(r.get(mapping.get("receiver_account_id", "")) or "").strip(),
            "amount": r.get(mapping.get("amount", "")),
            "currency": str(r.get(mapping.get("currency", "INR")) or "INR").strip(),
            "timestamp": r.get(mapping.get("timestamp", "")),
            "sender_name": str(r.get(mapping.get("sender_name", "")) or "").strip() or None,
            "receiver_name": str(r.get(mapping.get("receiver_name", "")) or "").strip() or None,
            "channel": str(r.get(mapping.get("channel", "WIRE")) or "WIRE").strip(),
            "location": str(r.get(mapping.get("location", "Mumbai, IN")) or "Mumbai, IN").strip(),
            "device_id": str(r.get(mapping.get("device_id", "")) or "").strip() or None,
        }

        # Check duplicate in batch or DB
        t_id = tx_data["transaction_id"]
        is_duplicate = False
        duplicate_reason = ""
        if t_id in seen_tx_ids:
            is_duplicate = True
            duplicate_reason = f"Duplicate transaction ID '{t_id}' within upload file."
        elif t_id in existing_in_db:
            is_duplicate = True
            duplicate_reason = f"Transaction ID '{t_id}' already exists in ledger database."

        seen_tx_ids.add(t_id)

        # Evaluate row with FraudRiskEngine
        res = FraudRiskEngine.evaluate(db, tx_data)

        if is_duplicate:
            dup_item = {
                "row_number": row_num,
                "transaction_id": t_id,
                "status": "duplicate",
                "reason": duplicate_reason,
                "data": tx_data,
                "risk_score": res["risk_score"],
                "risk_level": res["risk_level"],
                "recommended_action": "skip",
            }
            duplicate_rows.append(dup_item)
            all_row_reports.append(dup_item)

        elif not res["is_valid"]:
            inv_item = {
                "row_number": row_num,
                "transaction_id": t_id,
                "status": "invalid",
                "errors": res["integrity_errors"],
                "reason": "; ".join(e["message"] for e in res["integrity_errors"]),
                "data": tx_data,
                "risk_score": 100,
                "risk_level": "critical",
                "recommended_action": "reject",
            }
            invalid_rows.append(inv_item)
            all_row_reports.append(inv_item)

        else:
            # Valid record
            val_item = {
                "row_number": row_num,
                "transaction_id": t_id,
                "status": "valid",
                "data": tx_data,
                "risk_score": res["risk_score"],
                "risk_level": res["risk_level"],
                "recommended_action": res["recommended_action"],
                "rules_triggered": res["rules_triggered"],
                "warnings": res["data_quality_warnings"],
            }
            valid_rows.append(val_item)
            if res["recommended_action"] in ("review", "block"):
                held_rows.append(val_item)
            all_row_reports.append(val_item)

    # Risk Tier Counts for Valid Rows
    risk_counts = {
        "low": sum(1 for r in valid_rows if r["risk_level"] == "low"),
        "medium": sum(1 for r in valid_rows if r["risk_level"] == "medium"),
        "high": sum(1 for r in valid_rows if r["risk_level"] == "high"),
        "critical": sum(1 for r in valid_rows if r["risk_level"] == "critical"),
    }

    import_id = f"IMP-2026-{secrets.token_hex(4).upper()}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

    # Persist ImportJob
    job = ImportJob(
        import_id=import_id,
        user_id=user_id,
        filename=filename,
        dataset_type=dataset_type,
        status="previewed",
        total_rows=len(raw_rows),
        valid_rows=len(valid_rows),
        invalid_rows=len(invalid_rows),
        duplicate_rows=len(duplicate_rows),
        imported_rows=0,
        skipped_rows=0,
        rejected_rows=0,
        held_rows=len(held_rows),
        error_report=invalid_rows + duplicate_rows,
        preview_data={
            "headers": headers,
            "mapping": mapping,
            "sample_rows": [r["data"] for r in valid_rows[:10]],
            "risk_counts": risk_counts,
            "all_valid": [r["data"] for r in valid_rows],
        },
        expires_at=expires_at,
    )
    db.add(job)
    db.commit()

    return {
        "import_id": import_id,
        "filename": filename,
        "dataset_type": dataset_type,
        "status": "previewed",
        "expires_at": expires_at.isoformat(),
        "summary": {
            "total_rows": len(raw_rows),
            "valid_rows": len(valid_rows),
            "invalid_rows": len(invalid_rows),
            "duplicate_rows": len(duplicate_rows),
            "held_for_review_rows": len(held_rows),
            "risk_counts": risk_counts,
        },
        "headers": headers,
        "column_mapping": mapping,
        "sample_valid_rows": [r["data"] for r in valid_rows[:15]],
        "row_errors": invalid_rows[:50],
        "duplicate_preview": duplicate_rows[:50],
    }


def confirm_import_job(
    db: Session,
    import_id: str,
    user_id: int,
    policy: str = "partial", # "strict" | "partial"
    duplicate_policy: str = "skip", # "skip" | "reject"
) -> dict[str, Any]:
    """
    Commits valid records of the ImportJob to the actual database within a transaction.
    Enforces authorization, revalidates server-side, applies heuristic screening, and
    emits audit events.
    """
    job = db.scalar(select(ImportJob).where(ImportJob.import_id == import_id))
    if not job:
        raise HTTPException(404, "Import job not found.")

    if job.user_id != user_id:
        raise HTTPException(403, "Access denied. You can only confirm your own import jobs.")

    if job.status == "completed":
        raise HTTPException(400, "Import job has already been completed and committed.")

    now_utc = datetime.now(timezone.utc)
    if job.expires_at and job.expires_at.replace(tzinfo=timezone.utc) < now_utc:
        job.status = "failed"
        db.commit()
        raise HTTPException(410, "Import session expired. Please re-upload the file to preview.")

    # Strict policy check: if invalid or duplicate rows exist, fail entire batch
    if policy == "strict":
        if job.invalid_rows > 0 or (duplicate_policy == "reject" and job.duplicate_rows > 0):
            job.status = "failed"
            db.commit()
            raise HTTPException(
                422,
                f"Strict import policy rejected batch: {job.invalid_rows} invalid rows and {job.duplicate_rows} duplicate rows present."
            )

    job.status = "processing"
    db.commit()

    valid_candidates = job.preview_data.get("all_valid", [])
    imported_count = 0
    skipped_count = 0
    rejected_count = 0
    held_count = 0

    try:
        for tx_data in valid_candidates:
            # Re-screen server-side with commit=True
            res, tx = screen_and_gate_transaction(
                db=db,
                tx_data=tx_data,
                actor_user_id=user_id,
                source="excel_import",
                commit=True,
                import_id=job.import_id,
            )
            if tx is not None:
                imported_count += 1
                if tx.status in ("held", "flagged"):
                    held_count += 1
            else:
                rejected_count += 1

        if duplicate_policy == "skip":
            skipped_count += job.duplicate_rows
        else:
            rejected_count += job.duplicate_rows

        rejected_count += job.invalid_rows

        # Update Job
        job.status = "completed"
        job.imported_rows = imported_count
        job.skipped_rows = skipped_count
        job.rejected_rows = rejected_count
        job.held_rows = held_count
        job.completed_at = datetime.now(timezone.utc)

        # Audit
        db.add(
            AuditEvent(
                actor_user_id=user_id,
                action="import_batch_completed",
                entity_type="import_job",
                entity_id=job.import_id,
                details={
                    "filename": job.filename,
                    "imported_rows": imported_count,
                    "skipped_rows": skipped_count,
                    "rejected_rows": rejected_count,
                    "policy": policy,
                },
            )
        )
        db.commit()
        db.refresh(job)

        return {
            "import_id": job.import_id,
            "filename": job.filename,
            "status": "completed",
            "imported_rows": imported_count,
            "skipped_rows": skipped_count,
            "rejected_rows": rejected_count,
            "held_rows": held_count,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "message": f"Successfully ingested {imported_count} records into Finverse ledger ({held_count} held for AML scrutiny).",
        }

    except Exception as e:
        db.rollback()
        job.status = "failed"
        db.commit()
        raise HTTPException(500, f"Import transaction failed during database commit: {str(e)}")


def generate_error_report_csv(job: ImportJob) -> str:
    """
    Builds a downloadable error report CSV for rejected/duplicate rows.
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["Row Number", "Transaction ID", "Issue Category", "Error Reason", "Recommended Remediation"])

    err_list = job.error_report or []
    for err in err_list:
        row_no = err.get("row_number", "Unknown")
        tx_id = err.get("transaction_id", "Unknown")
        category = err.get("status", "validation_error").upper()
        reason = err.get("reason", "Data validation error")
        
        remediation = "Correct source spreadsheet values and re-upload."
        if category == "DUPLICATE":
            remediation = "Verify whether this transfer is already settled in database or re-assign unique TX ID."
        elif "amount" in reason.lower():
            remediation = "Provide a positive numeric value in INR."
        elif "sender" in reason.lower() or "receiver" in reason.lower():
            remediation = "Ensure both sender and receiver accounts are populated."

        # Formula injection safe prefix
        from app.export_service import sanitize_cell_value
        writer.writerow([
            row_no,
            sanitize_cell_value(tx_id),
            category,
            sanitize_cell_value(reason),
            remediation,
        ])

    return output.getvalue()
