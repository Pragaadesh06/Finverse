"""
Finverse Financial Report Export Service
Generates:
1. Multi-sheet Excel (.xlsx) workbooks using openpyxl with corporate styling, frozen panes,
   INR currency formatting, formula injection prevention, and auto-filters.
2. Safe UTF-8 CSV exports with formula injection defense.
3. Live Report Preview statistics for the frontend.
"""
from datetime import datetime, timezone, timedelta
import io
import csv
from typing import Any
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models import Transaction, Case, User

def sanitize_cell_value(val: Any) -> Any:
    """
    Prevent Spreadsheet Formula Injection (CSV/Excel injection).
    If a string starts with =, +, -, @, \\t, or \\r, prefix it with a single quote '.
    """
    if val is None:
        return ""
    if isinstance(val, (int, float, bool, datetime)):
        return val
    s = str(val).strip()
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s

def apply_filters(
    query,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    risk_category: str | None = None,
    status: str | None = None,
    client_id: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
):
    if start_date:
        query = query.where(Transaction.timestamp >= start_date)
    if end_date:
        query = query.where(Transaction.timestamp <= end_date)
    if risk_category and risk_category.lower() != "all":
        query = query.where(Transaction.risk_level == risk_category.lower())
    if status and status.lower() != "all":
        query = query.where(Transaction.status == status.lower())
    if client_id:
        c_term = client_id.strip()
        query = query.where(
            or_(
                Transaction.sender_account_id == c_term,
                Transaction.receiver_account_id == c_term,
                Transaction.sender_name.ilike(f"%{c_term}%"),
                Transaction.receiver_name.ilike(f"%{c_term}%"),
            )
        )
    if min_amount is not None:
        query = query.where(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.where(Transaction.amount <= max_amount)
    return query


def generate_report_preview(
    db: Session,
    report_type: str = "transactions",
    start_date: str | None = None,
    end_date: str | None = None,
    risk_category: str | None = None,
    status: str | None = None,
    client_id: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    page: int = 1,
    page_size: int = 15,
) -> dict[str, Any]:
    """
    Computes summary KPIs, breakdowns, and preview rows for the on-site UI preview.
    """
    s_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
    e_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None

    # Base query for transactions
    t_query = select(Transaction)
    t_query = apply_filters(t_query, s_dt, e_dt, risk_category, status, client_id, min_amount, max_amount)

    sub = t_query.subquery()
    total_records = db.scalar(select(func.count()).select_from(sub)) or 0
    total_val = db.scalar(select(func.sum(sub.c.amount))) or 0.0

    # Risk category breakdown
    risk_breakdown = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    cat_query = select(sub.c.risk_level, func.count()).select_from(sub).group_by(sub.c.risk_level)
    for r_lvl, cnt in db.execute(cat_query).all():
        if r_lvl in risk_breakdown:
            risk_breakdown[r_lvl] = cnt

    # Alerts (score >= 65 or high/critical)
    alert_query = select(func.count()).select_from(sub).where(
        or_(sub.c.risk_level.in_(["high", "critical"]), sub.c.risk_score >= 65)
    )
    alert_count = db.scalar(alert_query) or 0


    # Cases count and summaries
    cases_total = db.scalar(select(func.count(Case.id))) or 0
    cases_open = db.scalar(select(func.count(Case.id)).where(Case.status == "open")) or 0
    cases_escalated = db.scalar(select(func.count(Case.id)).where(Case.status == "escalated")) or 0

    # Preview rows
    offset = (page - 1) * page_size
    preview_txs = db.scalars(
        t_query.order_by(desc(Transaction.timestamp)).offset(offset).limit(page_size)
    ).all()

    items = []
    for tx in preview_txs:
        items.append({
            "transaction_id": tx.transaction_id,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "sender_account_id": tx.sender_account_id,
            "receiver_account_id": tx.receiver_account_id,
            "sender_name": tx.sender_name or tx.sender_account_id,
            "receiver_name": tx.receiver_name or tx.receiver_account_id,
            "amount": float(tx.amount),
            "currency": tx.currency or "INR",
            "status": tx.status,
            "risk_score": tx.risk_score,
            "risk_level": tx.risk_level,
            "recommended_action": tx.recommended_action,
            "channel": tx.channel or "WIRE",
        })

    # Summary narrative
    summary_text = (
        f"Generated financial analysis for {total_records:,} transactions with total volume of ₹{total_val:,.2f}. "
        f"Identified {alert_count} priority alerts ({(alert_count/total_records*100):.1f}% of volume) requiring scrutiny."
        if total_records > 0 else "No transactions match the selected criteria."
    )

    return {
        "report_title": f"Finverse Financial {report_type.replace('_', ' ').title()} Intelligence Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_type": report_type,
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "risk_category": risk_category or "all",
            "status": status or "all",
            "client_id": client_id,
            "min_amount": min_amount,
            "max_amount": max_amount,
        },
        "summary": summary_text,
        "kpis": {
            "total_records": total_records,
            "total_value_inr": round(total_val, 2),
            "alert_count": alert_count,
            "cases_open": cases_open,
            "cases_escalated": cases_escalated,
            "cases_total": cases_total,
            "risk_breakdown": risk_breakdown,
        },
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if total_records else 1,
            "total_records": total_records,
        },
    }


def build_excel_workbook(
    db: Session,
    report_type: str = "complete",
    start_date: str | None = None,
    end_date: str | None = None,
    risk_category: str | None = None,
    status: str | None = None,
    client_id: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    requested_columns: list[str] | None = None,
) -> io.BytesIO:
    """
    Constructs a styled multi-sheet XLSX file with:
    1. Executive Summary
    2. Clients or Accounts
    3. Transactions
    4. Fraud and AML Alerts
    5. Cases
    6. Detailed Analysis
    """
    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    s_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
    e_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None

    # Colors & Fonts (Old-money Deep Forest Green + Gold Palette)
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=14, bold=True, color="1E4D35")
    sub_font = Font(name="Calibri", size=10, italic=True, color="555555")
    bold_font = Font(name="Calibri", size=11, bold=True)
    normal_font = Font(name="Calibri", size=11)

    primary_fill = PatternFill(start_color="1E4D35", end_color="1E4D35", fill_type="solid") # Deep Forest Green
    gold_fill = PatternFill(start_color="B8860B", end_color="B8860B", fill_type="solid") # Old Gold
    summary_hdr_fill = PatternFill(start_color="24382B", end_color="24382B", fill_type="solid")
    alt_fill = PatternFill(start_color="F8FAF8", end_color="F8FAF8", fill_type="solid")
    
    # Alert fills
    critical_fill = PatternFill(start_color="FFD6D6", end_color="FFD6D6", fill_type="solid")
    high_fill = PatternFill(start_color="FFEAD2", end_color="FFEAD2", fill_type="solid")
    medium_fill = PatternFill(start_color="FFF8D6", end_color="FFF8D6", fill_type="solid")
    low_fill = PatternFill(start_color="E6F4EA", end_color="E6F4EA", fill_type="solid")

    thin_border = Border(
        left=Side(style="thin", color="E0E0E0"),
        right=Side(style="thin", color="E0E0E0"),
        top=Side(style="thin", color="E0E0E0"),
        bottom=Side(style="thin", color="E0E0E0"),
    )

    t_query = select(Transaction)
    t_query = apply_filters(t_query, s_dt, e_dt, risk_category, status, client_id, min_amount, max_amount)
    tx_list = db.scalars(t_query.order_by(desc(Transaction.timestamp)).limit(5000)).all()

    total_records = len(tx_list)
    total_val = sum(t.amount for t in tx_list)
    alert_txs = [t for t in tx_list if t.risk_level in ("high", "critical") or t.risk_score >= 65]
    
    cases_list = db.scalars(select(Case).order_by(desc(Case.updated_at)).limit(500)).all()

    # Determine sheets to create
    include_summary = True
    include_accounts = report_type in ("client", "complete")
    include_txs = report_type in ("transactions", "complete")
    include_alerts = report_type in ("fraud_alerts", "complete")
    include_cases = report_type in ("cases", "complete")
    include_analysis = report_type in ("complete", "transactions")

    # SHEET 1: Executive Summary
    if include_summary:
        ws_sum = wb.create_sheet(title="Executive Summary")
        ws_sum.views.sheetView[0].showGridLines = True
        
        ws_sum["A1"] = "FINVERSE RISK ORCHESTRATION PLATFORM"
        ws_sum["A1"].font = title_font
        ws_sum["A2"] = f"Executive Risk & Transaction Report | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
        ws_sum["A2"].font = sub_font
        
        # Meta table
        meta = [
            ("Report Type", report_type.upper()),
            ("Risk Filter", (risk_category or "All").upper()),
            ("Status Filter", (status or "All").upper()),
            ("Client / Account Identifier", client_id or "All Accounts"),
            ("Date Range", f"{start_date or 'Earliest'} to {end_date or 'Latest'}"),
            ("Total Transactions Analyzed", total_records),
            ("Total Ledger Value (INR)", f"₹ {total_val:,.2f}"),
            ("Flagged Alerts (High/Critical)", len(alert_txs)),
            ("Active Investigation Cases", len(cases_list)),
        ]
        
        ws_sum["A4"] = "REPORT CONFIGURATION & EXECUTIVE METRICS"
        ws_sum["A4"].font = bold_font
        ws_sum["A4"].fill = gold_fill
        ws_sum["A4"].font = Font(name="Calibri", bold=True, color="FFFFFF")
        ws_sum.merge_cells("A4:B4")
        
        for idx, (label, val) in enumerate(meta, start=5):
            ws_sum[f"A{idx}"] = label
            ws_sum[f"B{idx}"] = sanitize_cell_value(val)
            ws_sum[f"A{idx}"].font = bold_font
            ws_sum[f"A{idx}"].fill = alt_fill
            ws_sum[f"B{idx}"].font = normal_font
            ws_sum[f"A{idx}"].border = thin_border
            ws_sum[f"B{idx}"].border = thin_border

        # Risk distribution table
        ws_sum["A16"] = "RISK TIER BREAKDOWN"
        ws_sum["A16"].font = Font(name="Calibri", bold=True, color="FFFFFF")
        ws_sum["A16"].fill = summary_hdr_fill
        ws_sum.merge_cells("A16:C16")
        
        ws_sum["A17"] = "Risk Tier"
        ws_sum["B17"] = "Record Count"
        ws_sum["C17"] = "% of Total Volume"
        for col in ("A17", "B17", "C17"):
            ws_sum[col].font = bold_font
            ws_sum[col].fill = alt_fill
            ws_sum[col].border = thin_border
            
        tiers = [
            ("Low Risk (0-34)", sum(1 for t in tx_list if t.risk_level == "low")),
            ("Medium Risk (35-64)", sum(1 for t in tx_list if t.risk_level == "medium")),
            ("High Risk (65-84)", sum(1 for t in tx_list if t.risk_level == "high")),
            ("Critical Risk (85-100)", sum(1 for t in tx_list if t.risk_level == "critical")),
        ]
        for r_idx, (t_name, count) in enumerate(tiers, start=18):
            pct = (count / total_records * 100) if total_records > 0 else 0.0
            ws_sum[f"A{r_idx}"] = t_name
            ws_sum[f"B{r_idx}"] = count
            ws_sum[f"C{r_idx}"] = f"{pct:.1f}%"
            for c in (f"A{r_idx}", f"B{r_idx}", f"C{r_idx}"):
                ws_sum[c].font = normal_font
                ws_sum[c].border = thin_border

        ws_sum.column_dimensions["A"].width = 32
        ws_sum.column_dimensions["B"].width = 28
        ws_sum.column_dimensions["C"].width = 20

    # SHEET 2: Accounts / Counterparties
    if include_accounts:
        ws_acc = wb.create_sheet(title="Accounts & Counterparties")
        ws_acc.views.sheetView[0].showGridLines = True
        ws_acc.freeze_panes = "A2"
        
        acc_headers = [
            "Account Identifier", "Account Name", "Total Outflow (INR)", "Total Inflow (INR)",
            "Net Volume (INR)", "Transaction Count", "Highest Risk Observed"
        ]
        ws_acc.append(acc_headers)
        for col_idx in range(1, len(acc_headers) + 1):
            cell = ws_acc.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = primary_fill
            cell.alignment = Alignment(horizontal="center")

        # Aggregate by account
        acc_map: dict[str, dict[str, Any]] = {}
        for t in tx_list:
            s_acc = t.sender_account_id
            r_acc = t.receiver_account_id
            if s_acc not in acc_map:
                acc_map[s_acc] = {"name": t.sender_name or s_acc, "out": 0.0, "in": 0.0, "txs": 0, "max_score": 0}
            if r_acc not in acc_map:
                acc_map[r_acc] = {"name": t.receiver_name or r_acc, "out": 0.0, "in": 0.0, "txs": 0, "max_score": 0}
            
            acc_map[s_acc]["out"] += t.amount
            acc_map[s_acc]["txs"] += 1
            acc_map[s_acc]["max_score"] = max(acc_map[s_acc]["max_score"], t.risk_score)

            acc_map[r_acc]["in"] += t.amount
            acc_map[r_acc]["txs"] += 1
            acc_map[r_acc]["max_score"] = max(acc_map[r_acc]["max_score"], t.risk_score)

        row_idx = 2
        for acc_id, d in sorted(acc_map.items(), key=lambda x: x[1]["out"] + x[1]["in"], reverse=True):
            ws_acc.append([
                sanitize_cell_value(acc_id),
                sanitize_cell_value(d["name"]),
                round(d["out"], 2),
                round(d["in"], 2),
                round(d["out"] + d["in"], 2),
                d["txs"],
                d["max_score"],
            ])
            # Format currency
            for c_col in (3, 4, 5):
                ws_acc.cell(row=row_idx, column=c_col).number_format = '₹#,##0.00'
            row_idx += 1

        ws_acc.auto_filter.ref = ws_acc.dimensions
        for col in ws_acc.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_acc.column_dimensions[col_letter].width = max(max_len + 4, 15)

    # SHEET 3: Transactions
    if include_txs:
        ws_tx = wb.create_sheet(title="Transactions")
        ws_tx.views.sheetView[0].showGridLines = True
        ws_tx.freeze_panes = "A2"

        tx_headers = [
            "Transaction ID", "Timestamp (UTC)", "Sender Account", "Sender Name",
            "Receiver Account", "Receiver Name", "Amount (INR)", "Currency",
            "Channel", "Status", "Risk Score", "Risk Tier", "Recommended Action"
        ]
        ws_tx.append(tx_headers)
        for col_idx in range(1, len(tx_headers) + 1):
            cell = ws_tx.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = primary_fill
            cell.alignment = Alignment(horizontal="center")

        row_idx = 2
        for t in tx_list:
            ws_tx.append([
                sanitize_cell_value(t.transaction_id),
                t.timestamp.strftime("%Y-%m-%d %H:%M:%S") if t.timestamp else "",
                sanitize_cell_value(t.sender_account_id),
                sanitize_cell_value(t.sender_name),
                sanitize_cell_value(t.receiver_account_id),
                sanitize_cell_value(t.receiver_name),
                float(t.amount),
                t.currency or "INR",
                t.channel or "WIRE",
                t.status,
                t.risk_score,
                t.risk_level.upper(),
                t.recommended_action.replace("_", " ").title(),
            ])
            # Format currency
            ws_tx.cell(row=row_idx, column=7).number_format = '₹#,##0.00'
            # Risk styling
            r_cell = ws_tx.cell(row=row_idx, column=12)
            if t.risk_level == "critical":
                r_cell.fill = critical_fill
            elif t.risk_level == "high":
                r_cell.fill = high_fill
            elif t.risk_level == "medium":
                r_cell.fill = medium_fill
            else:
                r_cell.fill = low_fill
            row_idx += 1

        ws_tx.auto_filter.ref = ws_tx.dimensions
        for col in ws_tx.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_tx.column_dimensions[col_letter].width = max(min(max_len + 4, 45), 14)

    # SHEET 4: Fraud and AML Alerts
    if include_alerts:
        ws_alr = wb.create_sheet(title="Fraud & AML Alerts")
        ws_alr.views.sheetView[0].showGridLines = True
        ws_alr.freeze_panes = "A2"

        alert_headers = [
            "Alert ID", "Timestamp (UTC)", "Transaction ID", "Amount (INR)",
            "Risk Score", "Risk Tier", "Action Mandated", "Primary Typology Triggered", "Account Route"
        ]
        ws_alr.append(alert_headers)
        for col_idx in range(1, len(alert_headers) + 1):
            cell = ws_alr.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = gold_fill
            cell.alignment = Alignment(horizontal="center")

        row_idx = 2
        for t in alert_txs:
            top_reason = "Flagged under high risk behavioral heuristic"
            if t.risk_factors and isinstance(t.risk_factors, list) and len(t.risk_factors) > 0:
                first_rf = t.risk_factors[0]
                if isinstance(first_rf, dict):
                    top_reason = first_rf.get("name") or first_rf.get("label") or first_rf.get("description") or top_reason

            ws_alr.append([
                f"ALR-{t.transaction_id}",
                t.timestamp.strftime("%Y-%m-%d %H:%M:%S") if t.timestamp else "",
                sanitize_cell_value(t.transaction_id),
                float(t.amount),
                t.risk_score,
                t.risk_level.upper(),
                t.recommended_action.replace("_", " ").title(),
                sanitize_cell_value(top_reason),
                f"{sanitize_cell_value(t.sender_account_id)} -> {sanitize_cell_value(t.receiver_account_id)}",
            ])
            ws_alr.cell(row=row_idx, column=4).number_format = '₹#,##0.00'
            ws_alr.cell(row=row_idx, column=6).fill = critical_fill if t.risk_level == "critical" else high_fill
            row_idx += 1

        ws_alr.auto_filter.ref = ws_alr.dimensions
        for col in ws_alr.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_alr.column_dimensions[col_letter].width = max(min(max_len + 4, 50), 15)

    # SHEET 5: Cases
    if include_cases:
        ws_cs = wb.create_sheet(title="Investigation Cases")
        ws_cs.views.sheetView[0].showGridLines = True
        ws_cs.freeze_panes = "A2"

        case_headers = [
            "Case ID", "Title", "Typology", "Severity", "Status", "Assigned Lead Analyst",
            "Related Transactions", "Related Accounts", "Created At"
        ]
        ws_cs.append(case_headers)
        for col_idx in range(1, len(case_headers) + 1):
            cell = ws_cs.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = primary_fill
            cell.alignment = Alignment(horizontal="center")

        row_idx = 2
        for c in cases_list:
            ws_cs.append([
                sanitize_cell_value(c.case_id),
                sanitize_cell_value(c.title),
                sanitize_cell_value(c.case_type),
                c.severity.upper(),
                c.status.upper(),
                sanitize_cell_value(c.assigned_to or "Unassigned"),
                len(c.related_transaction_ids or []),
                len(c.related_accounts or []),
                c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            ])
            row_idx += 1

        ws_cs.auto_filter.ref = ws_cs.dimensions
        for col in ws_cs.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_cs.column_dimensions[col_letter].width = max(min(max_len + 4, 40), 16)

    # SHEET 6: Detailed Analysis
    if include_analysis:
        ws_an = wb.create_sheet(title="Detailed Analysis")
        ws_an.views.sheetView[0].showGridLines = True

        ws_an["A1"] = "PORTFOLIO RISK & VELOCITY ANALYSIS"
        ws_an["A1"].font = title_font

        # Channel breakdown table
        ws_an["A3"] = "Payment Channel Distribution"
        ws_an["A3"].font = bold_font
        ws_an["A4"] = "Channel"
        ws_an["B4"] = "Count"
        ws_an["C4"] = "Total Volume (INR)"
        ws_an["D4"] = "Avg Risk Score"
        for col in ("A4", "B4", "C4", "D4"):
            ws_an[col].font = header_font
            ws_an[col].fill = summary_hdr_fill

        channel_stats: dict[str, dict[str, Any]] = {}
        for t in tx_list:
            ch = t.channel or "WIRE"
            if ch not in channel_stats:
                channel_stats[ch] = {"cnt": 0, "sum": 0.0, "scores": []}
            channel_stats[ch]["cnt"] += 1
            channel_stats[ch]["sum"] += t.amount
            channel_stats[ch]["scores"].append(t.risk_score)

        r_num = 5
        for ch, stats in sorted(channel_stats.items(), key=lambda x: x[1]["sum"], reverse=True):
            avg_s = sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else 0
            ws_an[f"A{r_num}"] = ch
            ws_an[f"B{r_num}"] = stats["cnt"]
            ws_an[f"C{r_num}"] = round(stats["sum"], 2)
            ws_an[f"D{r_num}"] = round(avg_s, 1)
            ws_an[f"C{r_num}"].number_format = '₹#,##0.00'
            r_num += 1

        ws_an.column_dimensions["A"].width = 24
        ws_an.column_dimensions["B"].width = 16
        ws_an.column_dimensions["C"].width = 26
        ws_an.column_dimensions["D"].width = 18

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def build_csv_export(
    db: Session,
    report_type: str = "transactions",
    start_date: str | None = None,
    end_date: str | None = None,
    risk_category: str | None = None,
    status: str | None = None,
    client_id: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
) -> str:
    """
    Builds a UTF-8 CSV with formula injection sanitization.
    """
    s_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else None
    e_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else None

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    if report_type == "cases":
        writer.writerow(["Case ID", "Title", "Typology", "Severity", "Status", "Assigned Analyst", "Created At"])
        cases = db.scalars(select(Case).order_by(desc(Case.updated_at))).all()
        for c in cases:
            writer.writerow([
                sanitize_cell_value(c.case_id),
                sanitize_cell_value(c.title),
                sanitize_cell_value(c.case_type),
                c.severity,
                c.status,
                sanitize_cell_value(c.assigned_to),
                c.created_at.isoformat() if c.created_at else "",
            ])
    else:
        # Default Transactions / Fraud alerts
        writer.writerow([
            "Transaction ID", "Timestamp UTC", "Sender Account", "Sender Name",
            "Receiver Account", "Receiver Name", "Amount INR", "Currency",
            "Channel", "Status", "Risk Score", "Risk Tier", "Recommended Action"
        ])
        t_query = select(Transaction)
        t_query = apply_filters(t_query, s_dt, e_dt, risk_category, status, client_id, min_amount, max_amount)
        if report_type == "fraud_alerts":
            t_query = t_query.where(or_(Transaction.risk_level.in_(["high", "critical"]), Transaction.risk_score >= 65))

        txs = db.scalars(t_query.order_by(desc(Transaction.timestamp)).limit(10000)).all()
        for t in txs:
            writer.writerow([
                sanitize_cell_value(t.transaction_id),
                t.timestamp.isoformat() if t.timestamp else "",
                sanitize_cell_value(t.sender_account_id),
                sanitize_cell_value(t.sender_name),
                sanitize_cell_value(t.receiver_account_id),
                sanitize_cell_value(t.receiver_name),
                f"{t.amount:.2f}",
                t.currency or "INR",
                t.channel or "WIRE",
                t.status,
                t.risk_score,
                t.risk_level,
                t.recommended_action,
            ])

    return output.getvalue()
