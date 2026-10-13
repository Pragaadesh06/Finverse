# Finverse — Real-Time Fraud & AML Risk Orchestration Platform

Finverse is an enterprise-grade real-time financial fraud and Anti-Money Laundering (AML) risk orchestration platform designed for compliance analysts, fraud investigators, and financial risk officers.

---

## Architecture Overview

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Cytoscape network graph, React Router.
- **Backend**: Python 3.14+ / FastAPI, SQLAlchemy ORM, Uvicorn ASGI server.
- **Database**: SQLite (default local development `finverse.db`) with full PostgreSQL production compatibility.
- **Excel Processing**: `openpyxl` (version 3.1.5) for native XLSX generation and safe `data_only=True` parsing.
- **Real-Time Feed**: WebSockets (`/ws/transactions`) for immediate event distribution after database commit.
- **Design Language**: Old-Money Editorial aesthetic (Deep Forest Green `#1E4D35`, Brass/Old Gold `#B8860B`, Ivory Parchment, Dark/Light mode).

---

## Key Modules

### 1. Export Center (`/export`)
Generate financial reports, preview telemetry on-site, and download authenticated Excel workbooks or CSV ledgers.
- **Report Types**:
  - `complete`: Comprehensive multi-sheet workbook (all sheets).
  - `transactions`: Filtered transaction ledger with INR amounts and risk tiers.
  - `fraud_alerts`: High and critical priority risk detections and typologies.
  - `client`: Counterparty inflows, outflows, and net exposure summaries.
  - `cases`: Registered AML investigation cases and assigned analysts.
- **On-Site Live Preview**:
  - Filter by date range, risk category, transaction status, account identifier, and amount limits.
  - Real-time KPI cards formatted in Indian Rupee (`₹` / INR).
  - Recharts risk breakdown chart.
  - Paginated, searchable record preview table.
- **Excel Generation (`openpyxl`)**:
  - Multi-sheet workbook (`Executive Summary`, `Accounts & Counterparties`, `Transactions`, `Fraud & AML Alerts`, `Investigation Cases`, `Detailed Analysis`).
  - Professional typography, frozen panes, currency formatting (`₹#,##0.00`), text badges, and auto-filters.
  - **Formula Injection Mitigation**: All cell values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are sanitized by prefixing with `'`.
- **CSV Export**:
  - Properly quoted, UTF-8 encoded with BOM (`utf-8-sig`) for Excel compatibility and formula injection defense.

### 2. Import Data Wizard (`/import`)
A 7-step guided pipeline for ingesting external financial records:
1. **Upload File**: Drag-and-drop or file selector. Validates magic bytes (ZIP/PK container for XLSX, text decodable for CSV) and enforces a 10 MB / 10,000 row limit. Embedded macros and external links are rejected.
2. **Dataset Selection**: Confirms transaction ledger schema.
3. **Column Mapping**: Automatically maps source headers to Finverse schema fields (`transaction_id`, `sender_account_id`, `receiver_account_id`, `amount`, `currency`, `timestamp`, `channel`, etc.) with manual override options.
4. **Pre-Screening & Preview**: Pre-screens valid candidate rows through the `FraudRiskEngine`, returning counts for valid, invalid, duplicate, and held rows.
5. **Row-Level Error Audit**: Shows row-by-row validation failures and duplicates with recommended corrections.
6. **Confirmation Dialog**: Requires explicit confirmation and policy selection:
   - *Batch Policy*: `partial` (commit eligible rows, log rejected) vs `strict` (roll back if any invalid row).
   - *Duplicate Policy*: `skip` (default) vs `reject`.
7. **Commit & Downloadable Error Report**: Commits valid records into database within a single transaction, emits WebSocket events, and provides a downloadable `import_{id}_rejected_rows.csv` report.

### 3. Import History (`/import` -> Tab 2)
Auditable job history tracking:
- Import ID, original filename, dataset type, creation timestamp, and completion status.
- Counts for total rows, imported, skipped, rejected, and held for review.
- Download button for rejected-row error reports.

### 4. Real-Time Risk Monitor & Pre-Ingestion Gate (`/risk-monitor`)
Real-time fraud screening service (`FraudRiskEngine`) evaluating transactions before they enter trusted records:
- **Detection Rules**:
  - `RULE-INT-001` to `RULE-INT-006`: Data integrity (mandatory fields, non-positive amount rejection, unsupported currency, duplicate IDs, self-transfers).
  - `RULE-BEH-001`: Structuring / Smurfing Evasion (transfers ₹9.5L–₹9.999L benchmarked just below the ₹10,00,000 statutory CTR limit).
  - `RULE-BEH-002`: Severe Amount Outliers (> ₹50,00,000 critical limit, > ₹10,00,000 high limit).
  - `RULE-BEH-003`: Velocity Bursts (≥ 3 transfers from same sender within 15 minutes).
  - `RULE-BEH-004`: High-Risk Channel / Unregulated Virtual Asset Gateways.
  - `RULE-AML-001`: Closed Circular Money Laundering Ring (identifying cycles e.g. ACC-8491 → ACC-3042 → ACC-6109 → ACC-1928 or bilateral 24h round trips).
  - `RULE-AML-002`: Mule Collector Fan-In Aggregation Node (≥ 3 distinct senders to a single receiver within 2 hours).
  - `RULE-AML-004`: FATF Sanctioned or High-Risk Secrecy Jurisdictions.
- **Telemetry Counter**: Live dashboard showing Screened, Accepted, Held, Blocked, and Average Risk Score.
- **Manual Pre-Screening Gate**: Interactive modal allowing analysts to dry-run or gate-and-commit transactions with explainable rule feedback.

---

## API Endpoints

### Report Export Endpoints
- `GET /api/reports/preview`: Computes preview summary, risk breakdown, and paginated rows.
- `GET /api/reports/export?format=xlsx`: Generates and streams styled multi-sheet XLSX.
- `GET /api/reports/export?format=csv`: Streams formula-injection sanitized CSV.

### Import Endpoints
- `POST /api/imports/preview`: Multipart upload for parsing, column mapping, and row pre-screening.
- `POST /api/imports/confirm`: Confirms batch with `partial`/`strict` and duplicate policies.
- `GET /api/imports`: Lists user's import history.
- `GET /api/imports/{import_id}`: Retrieves job metadata and summary.
- `GET /api/imports/{import_id}/errors`: Downloads rejected-row error report CSV.

### Screening & Risk Monitor Endpoints
- `POST /api/transactions/screen`: Evaluates candidate transactions (dry-run or pre-ingestion commit).
- `POST /api/transactions/{id}/rescreen`: Re-evaluates stored transaction against latest detection rules.
- `POST /api/screenings/{id}/override`: Allows authorized managers to override risk decisions with audit trail.
- `GET /api/risk-monitor/stats`: Live screening telemetry counters.
- `GET /api/risk-monitor/feed`: Recent screened transactions and rule-trigger events.

---

## Quick Start & Verification

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). Log in with demo credentials:
- **Email**: `demo@finverse.io`
- **Password**: `demo`

### 3. Run Automated Tests
```bash
python -m pytest backend/tests -v
npm run build
```

---

## Supported Column Mappings

When uploading `.xlsx` or `.csv` files, Finverse automatically detects common header aliases:
| Finverse Field | Accepted Aliases | Mandatory |
| :--- | :--- | :---: |
| `transaction_id` | `transaction_id`, `tx_id`, `txn_id`, `reference_id`, `ref_no` | No (auto-generated if omitted) |
| `sender_account_id` | `sender_account_id`, `sender_account`, `from_account`, `debit_account` | **Yes** |
| `receiver_account_id` | `receiver_account_id`, `receiver_account`, `to_account`, `credit_account` | **Yes** |
| `amount` | `amount`, `txn_amount`, `value`, `sum` | **Yes** |
| `currency` | `currency`, `curr`, `ccy` | No (defaults to INR) |
| `timestamp` | `timestamp`, `date`, `tx_date`, `time`, `created_at` | No (defaults to UTC now) |
| `channel` | `channel`, `payment_channel`, `method`, `type` | No (defaults to WIRE) |

---

## Security & Limitations

1. **Authentication & Authorization**: All import and export endpoints require authenticated session cookies or Bearer tokens. Decision overrides are restricted to Senior Analysts and Managers.
2. **Formula Injection**: Spreadsheet formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are escaped with a leading single quote (`'`) in both XLSX and CSV outputs.
3. **No Machine Learning Claims**: Rule-based heuristic and graph topology scoring are deterministic and explainable. No trained ML models are falsely claimed.
4. **Data Isolation**: Import previews expire after 2 hours and are isolated by user ID.
