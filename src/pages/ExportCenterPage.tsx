import React, { useState, useEffect } from "react";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Briefcase,
  Layers,
  Search,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { exportService } from "../services/exportService";
import { ReportConfig, ReportPreview, ReportType } from "../types";

export const ExportCenterPage: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    report_type: "complete",
    risk_category: "all",
    status: "all",
    client_id: "",
    start_date: "",
    end_date: "",
    min_amount: undefined,
    max_amount: undefined,
    format: "xlsx",
  });

  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"xlsx" | "csv" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      const data = await exportService.getReportPreview(config, page, pageSize);
      setPreview(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load report preview.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [config.report_type, config.risk_category, config.status, page]);

  const handleDownload = async (format: "xlsx" | "csv") => {
    setIsDownloading(true);
    setDownloadFormat(format);
    setError(null);
    setDownloadSuccess(null);
    try {
      await exportService.downloadReport({ ...config, format });
      setDownloadSuccess(
        `Successfully generated and downloaded ${format.toUpperCase()} report with formula injection sanitization.`
      );
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.message || `Failed to download ${format.toUpperCase()} file.`);
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  // Format INR currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Risk chart data
  const riskChartData = preview?.kpis?.risk_breakdown
    ? [
        { name: "Low Risk", count: preview.kpis.risk_breakdown.low, color: "#2E7D52" },
        { name: "Medium Risk", count: preview.kpis.risk_breakdown.medium, color: "#D4A017" },
        { name: "High Risk", count: preview.kpis.risk_breakdown.high, color: "#E67E22" },
        { name: "Critical Risk", count: preview.kpis.risk_breakdown.critical, color: "#C0392B" },
      ]
    : [];

  // Filter items in table by local search term
  const filteredItems = (preview?.items || []).filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.transaction_id.toLowerCase().includes(term) ||
      item.sender_account_id.toLowerCase().includes(term) ||
      item.receiver_account_id.toLowerCase().includes(term) ||
      (item.sender_name && item.sender_name.toLowerCase().includes(term)) ||
      (item.receiver_name && item.receiver_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg" style={{ background: "rgba(30,77,53,0.15)", color: "var(--primary-brass)" }}>
              <FileDown className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
              Financial Intelligence Export Center
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Generate authenticated financial reports, review live telemetry, and export multi-sheet Excel (.xlsx) workbooks or secure CSV files.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => handleDownload("csv")}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            {isDownloading && downloadFormat === "csv" ? "Exporting CSV..." : "Export CSV"}
          </Button>
          <Button
            variant="primary"
            onClick={() => handleDownload("xlsx")}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-300" />
            {isDownloading && downloadFormat === "xlsx" ? "Generating XLSX..." : "Export Excel (.xlsx)"}
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {downloadSuccess && (
        <div className="p-4 rounded-lg flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{downloadSuccess}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-lg flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Report Configuration Card ── */}
      <Card className="p-5 border" style={{ borderColor: "var(--border-subtle)", background: "var(--card-bg)" }}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary-brass)]" />
            <h2 className="text-base font-medium font-serif text-[var(--text-primary)]">Report Parameters & Filter Scope</h2>
          </div>
          <button
            onClick={fetchPreview}
            disabled={isLoadingPreview}
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-neutral-800/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? "animate-spin" : ""}`} />
            Refresh Preview
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Report Type
            </label>
            <select
              value={config.report_type}
              onChange={(e) => setConfig({ ...config, report_type: e.target.value as ReportType })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            >
              <option value="complete">Complete Comprehensive Dossier (All Sheets)</option>
              <option value="transactions">Transactions Ledger</option>
              <option value="fraud_alerts">Fraud & AML Alerts</option>
              <option value="client">Accounts & Counterparty Summary</option>
              <option value="cases">Investigation Cases</option>
            </select>
          </div>

          {/* Risk Category */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Risk Category
            </label>
            <select
              value={config.risk_category}
              onChange={(e) => setConfig({ ...config, risk_category: e.target.value })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk Only (0-34)</option>
              <option value="medium">Medium Risk (35-64)</option>
              <option value="high">High Risk (65-84)</option>
              <option value="critical">Critical Risk (85-100)</option>
            </select>
          </div>

          {/* Transaction Status */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Transaction Status
            </label>
            <select
              value={config.status}
              onChange={(e) => setConfig({ ...config, status: e.target.value })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            >
              <option value="all">All Statuses</option>
              <option value="settled">Settled / Processed</option>
              <option value="flagged">Flagged</option>
              <option value="held">Held for AML Review</option>
              <option value="blocked">Blocked</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>

          {/* Client / Account ID */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Account / Client Filter
            </label>
            <input
              type="text"
              placeholder="e.g. ACC-8491 or Apex"
              value={config.client_id || ""}
              onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
              Start Date
            </label>
            <input
              type="date"
              value={config.start_date || ""}
              onChange={(e) => setConfig({ ...config, start_date: e.target.value })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
              End Date
            </label>
            <input
              type="date"
              value={config.end_date || ""}
              onChange={(e) => setConfig({ ...config, end_date: e.target.value })}
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            />
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Min Amount (INR)
            </label>
            <input
              type="number"
              placeholder="Min ₹"
              value={config.min_amount ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  min_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            />
          </div>

          {/* Max Amount */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Max Amount (INR)
            </label>
            <input
              type="number"
              placeholder="Max ₹"
              value={config.max_amount ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  max_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full text-sm rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--primary-brass)]"
            />
          </div>
        </div>

        <div className="mt-4 pt-3 flex justify-end">
          <Button
            variant="secondary"
            onClick={fetchPreview}
            disabled={isLoadingPreview}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? "animate-spin" : ""}`} />
            Apply Filters & Generate Preview
          </Button>
        </div>
      </Card>

      {/* ── KPI Telemetry Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <Card className="p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Records Analyzed
            </span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-2">
            {preview ? preview.kpis.total_records.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Matching active filters
          </div>
        </Card>

        {/* Total Ledger Value */}
        <Card className="p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Total Volume
            </span>
            <span className="text-xs font-bold text-amber-500">INR</span>
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-2">
            {preview ? formatINR(preview.kpis.total_value_inr) : "—"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Settled ledger exposure
          </div>
        </Card>

        {/* Flagged Alerts */}
        <Card className="p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Priority Alerts
            </span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-red-400 mt-2">
            {preview ? preview.kpis.alert_count.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            High & critical risk alerts
          </div>
        </Card>

        {/* Investigation Cases */}
        <Card className="p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Active Cases
            </span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-2">
            {preview ? preview.kpis.cases_total.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {preview ? `${preview.kpis.cases_open} open, ${preview.kpis.cases_escalated} escalated` : "—"}
          </div>
        </Card>
      </div>

      {/* ── Executive Narrative & Risk Distribution Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative Box */}
        <Card className="lg:col-span-2 p-5 border border-[var(--border-subtle)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold font-serif text-[var(--text-primary)]">
                Executive Synthesis
              </h3>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                Generated: {preview ? new Date(preview.generated_at).toUTCString() : "Pending"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {preview?.summary || "Computing executive narrative based on filtered transactions..."}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded bg-neutral-800/40 border border-neutral-700/40">
              Scope: <strong>{config.report_type.toUpperCase()}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-neutral-800/40 border border-neutral-700/40">
              Risk: <strong>{config.risk_category?.toUpperCase() || "ALL"}</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-neutral-800/40 border border-neutral-700/40">
              Sanitization: <strong>FORMULA INJECTION ESCAPED</strong>
            </span>
            <span className="px-2.5 py-1 rounded bg-neutral-800/40 border border-neutral-700/40">
              Standard: <strong>PMLA / FATF STATUTORY CTR</strong>
            </span>
          </div>
        </Card>

        {/* Risk Breakdown Bar Chart */}
        <Card className="p-5 border border-[var(--border-subtle)] flex flex-col justify-between">
          <h3 className="text-sm font-semibold font-serif text-[var(--text-primary)] mb-3">
            Risk Tier Distribution
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18201A",
                    borderColor: "#334537",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── On-Site Preview Data Table ── */}
      <Card className="border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-serif font-bold text-[var(--text-primary)]">
              Audited Report Records Preview
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Showing page {page} of {preview?.pagination.total_pages || 1} ({preview?.pagination.total_records || 0} total matching rows)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Filter preview rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs rounded-md pl-9 pr-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-neutral-900/30 text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Sender Counterparty</th>
                <th className="py-3 px-4">Receiver Beneficiary</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Risk Score</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoadingPreview ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--text-secondary)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--primary-brass)]" />
                    Fetching report records...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--text-secondary)]">
                    No transactions match the selected filter configuration.
                  </td>
                </tr>
              ) : (
                filteredItems.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                      {tx.transaction_id}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-GB") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--text-primary)]">{tx.sender_name || tx.sender_account_id}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">{tx.sender_account_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[var(--text-primary)]">{tx.receiver_name || tx.receiver_account_id}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">{tx.receiver_account_id}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">
                      {tx.channel || "WIRE"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          tx.risk_level === "critical"
                            ? "critical"
                            : tx.risk_level === "high"
                            ? "high"
                            : tx.risk_level === "medium"
                            ? "medium"
                            : "low"
                        }
                      >
                        {tx.risk_score ?? "—"} ({tx.risk_level?.toUpperCase()})
                      </Badge>
                    </td>
                    <td className="py-3 px-4 capitalize text-[var(--text-secondary)]">
                      {tx.recommended_action?.replace("_", " ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {preview && preview.pagination.total_pages > 1 && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">
              Page {page} of {preview.pagination.total_pages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= preview.pagination.total_pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
