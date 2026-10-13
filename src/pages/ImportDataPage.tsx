import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  ShieldAlert,
  Database,
  History,
  Info,
} from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { importService } from "../services/importService";
import {
  ImportPreviewResponse,
  ImportConfirmResponse,
  ImportJobItem,
  RowErrorItem,
} from "../types";

export const ImportDataPage: React.FC = () => {
  // Wizard steps: 1 = Upload, 2 = Mapping, 3 = Preview & Screening, 4 = Error Inspection, 5 = Confirmation / Results
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"wizard" | "history">("wizard");

  // File & Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState<string>("transactions");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview & Mapping State
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Confirmation & Commit State
  const [policy, setPolicy] = useState<"partial" | "strict">("partial");
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "reject">("skip");
  const [isConfirming, setIsConfirming] = useState(false);
  const [commitResult, setCommitResult] = useState<ImportConfirmResponse | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // History State
  const [historyJobs, setHistoryJobs] = useState<ImportJobItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await importService.listImportJobs(1, 20);
      setHistoryJobs(res.items || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "csv") {
      setUploadError("Unsupported file type. Please upload a genuine .xlsx or .csv document.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds maximum permissible limit of 10 MB.");
      return;
    }
    setSelectedFile(file);
  };

  // Upload & Parse File
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await importService.uploadAndPreview(selectedFile, datasetType);
      setPreviewData(res);
      setColumnMapping(res.column_mapping || {});
      setCurrentStep(2); // Advance to mapping / inspection
    } catch (err: any) {
      setUploadError(err?.message || "Failed to parse spreadsheet.");
    } finally {
      setIsUploading(false);
    }
  };

  // Re-run preview with custom mappings
  const handleReapplyMapping = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await importService.uploadAndPreview(selectedFile, datasetType, columnMapping);
      setPreviewData(res);
      setCurrentStep(3); // Advance to preview
    } catch (err: any) {
      setUploadError(err?.message || "Failed to re-evaluate with current mapping.");
    } finally {
      setIsUploading(false);
    }
  };

  // Commit Import
  const handleExecuteCommit = async () => {
    if (!previewData) return;
    setIsConfirming(true);
    setUploadError(null);
    try {
      const res = await importService.confirmImport(previewData.import_id, policy, duplicatePolicy);
      setCommitResult(res);
      setShowConfirmModal(false);
      setCurrentStep(5); // Advance to final results
      fetchHistory();
    } catch (err: any) {
      setUploadError(err?.message || "Failed to commit import records.");
      setShowConfirmModal(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDownloadErrors = async (importId: string) => {
    try {
      await importService.downloadErrorReport(importId);
    } catch (err: any) {
      alert(err?.message || "Failed to download error report.");
    }
  };

  const handleResetWizard = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setCommitResult(null);
    setCurrentStep(1);
    setUploadError(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border-subtle)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg" style={{ background: "rgba(184,134,11,0.15)", color: "var(--primary-brass)" }}>
              <UploadCloud className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
              Financial Data Ingestion & Import Center
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Safely ingest existing Excel or CSV records into Finverse with magic-byte verification, column mapping, pre-ingestion fraud screening, and auditable error reports.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-neutral-900/60 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setActiveTab("wizard")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "wizard"
                ? "bg-[var(--primary-forest)] text-emerald-100 shadow"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              activeTab === "history"
                ? "bg-[var(--primary-forest)] text-emerald-100 shadow"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Import History
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="p-4 rounded-lg flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{uploadError}</span>
        </div>
      )}

      {/* ── TAB 1: IMPORT WIZARD ── */}
      {activeTab === "wizard" && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="grid grid-cols-5 gap-2 border-b border-[var(--border-subtle)] pb-4 text-xs">
            {[
              { step: 1, title: "1. Upload File" },
              { step: 2, title: "2. Column Mapping" },
              { step: 3, title: "3. Pre-Screening" },
              { step: 4, title: "4. Error Audit" },
              { step: 5, title: "5. Commit & Report" },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center gap-2 pb-1 border-b-2 transition ${
                  currentStep === s.step
                    ? "border-[var(--primary-brass)] text-[var(--primary-brass)] font-semibold"
                    : currentStep > s.step
                    ? "border-emerald-600 text-emerald-400"
                    : "border-transparent text-[var(--text-muted)]"
                }`}
              >
                <span>{s.title}</span>
              </div>
            ))}
          </div>

          {/* ── STEP 1: Upload File ── */}
          {currentStep === 1 && (
            <Card className="p-8 border border-[var(--border-subtle)] text-center max-w-3xl mx-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-10 cursor-pointer transition flex flex-col items-center justify-center gap-3 hover:border-[var(--primary-brass)] hover:bg-neutral-900/30"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="p-4 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-[var(--text-primary)]">
                    {selectedFile ? selectedFile.name : "Select or drag & drop spreadsheet"}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Accepts authentic <strong>.xlsx</strong> and <strong>.csv</strong> files (Up to 10 MB, max 10,000 rows).
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded bg-emerald-900/20 border border-emerald-700/40 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{(selectedFile.size / 1024).toFixed(1)} KB ready for parsing</span>
                  </div>
                )}
              </div>

              {/* Dataset Type Selector */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-left max-w-md mx-auto">
                <div className="w-full">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Dataset Schema Type:
                  </label>
                  <select
                    value={datasetType}
                    onChange={(e) => setDatasetType(e.target.value)}
                    className="w-full text-xs rounded-md px-3 py-2 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
                  >
                    <option value="transactions">Financial Transactions Ledger</option>
                    <option value="accounts" disabled>Client Accounts (Requires persistent schema)</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  variant="primary"
                  disabled={!selectedFile || isUploading}
                  onClick={handleUploadAndAnalyze}
                  className="flex items-center gap-2 px-6"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Parsing & Evaluating...
                    </>
                  ) : (
                    <>
                      Inspect & Map Columns
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Security Advisory */}
              <div className="mt-8 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-left flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Data Privacy & Security Enforcement:</strong> All uploaded spreadsheets are validated for magic byte signatures and sanitized against formula injection. Embedded macros and external links are strictly ignored.
                </span>
              </div>
            </Card>
          )}

          {/* ── STEP 2: Column Mapping ── */}
          {currentStep === 2 && previewData && (
            <Card className="p-6 border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-base font-serif font-bold text-[var(--text-primary)]">
                    Map Source Columns to Finverse Schema
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Match fields from <strong>{previewData.filename}</strong> to Finverse ledger properties.
                  </p>
                </div>
                <Badge variant="low">
                  {previewData.headers.length} Headers Detected
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: "transaction_id", label: "Transaction ID", required: false },
                  { key: "sender_account_id", label: "Sender Account ID", required: true },
                  { key: "receiver_account_id", label: "Receiver Account ID", required: true },
                  { key: "amount", label: "Amount (INR)", required: true },
                  { key: "currency", label: "Currency (INR)", required: false },
                  { key: "timestamp", label: "Timestamp (Date/Time)", required: false },
                  { key: "sender_name", label: "Sender Full Name", required: false },
                  { key: "receiver_name", label: "Receiver Full Name", required: false },
                  { key: "channel", label: "Payment Channel", required: false },
                  { key: "location", label: "Location / City", required: false },
                  { key: "device_id", label: "Device Fingerprint", required: false },
                ].map((field) => (
                  <div key={field.key} className="p-3 rounded-lg bg-neutral-900/30 border border-neutral-800">
                    <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <select
                      value={columnMapping[field.key] || ""}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                      }
                      className="w-full text-xs rounded-md px-2.5 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
                    >
                      <option value="">— Unmapped / Auto-generate —</option>
                      {previewData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button variant="primary" onClick={handleReapplyMapping} disabled={isUploading}>
                  {isUploading ? "Screening Rows..." : "Validate & Pre-Screen Rows"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── STEP 3: Pre-Screening Summary & Sample Rows ── */}
          {currentStep === 3 && previewData && (
            <div className="space-y-6">
              {/* Telemetry Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className="p-3 border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-secondary)] uppercase">Total Rows</div>
                  <div className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1">
                    {previewData.summary.total_rows}
                  </div>
                </Card>

                <Card className="p-3 border border-emerald-900/40 bg-emerald-950/10">
                  <div className="text-[11px] text-emerald-400 uppercase">Valid Rows</div>
                  <div className="text-xl font-serif font-bold text-emerald-300 mt-1">
                    {previewData.summary.valid_rows}
                  </div>
                </Card>

                <Card className="p-3 border border-red-900/40 bg-red-950/10">
                  <div className="text-[11px] text-red-400 uppercase">Invalid Rows</div>
                  <div className="text-xl font-serif font-bold text-red-300 mt-1">
                    {previewData.summary.invalid_rows}
                  </div>
                </Card>

                <Card className="p-3 border border-amber-900/40 bg-amber-950/10">
                  <div className="text-[11px] text-amber-400 uppercase">Duplicates</div>
                  <div className="text-xl font-serif font-bold text-amber-300 mt-1">
                    {previewData.summary.duplicate_rows}
                  </div>
                </Card>

                <Card className="p-3 border border-purple-900/40 bg-purple-950/10">
                  <div className="text-[11px] text-purple-400 uppercase">Held for AML</div>
                  <div className="text-xl font-serif font-bold text-purple-300 mt-1">
                    {previewData.summary.held_for_review_rows}
                  </div>
                </Card>

                <Card className="p-3 border border-[var(--border-subtle)]">
                  <div className="text-[11px] text-[var(--text-secondary)] uppercase">Critical Risk</div>
                  <div className="text-xl font-serif font-bold text-red-400 mt-1">
                    {previewData.summary.risk_counts.critical}
                  </div>
                </Card>
              </div>

              {/* Sample Valid Rows Table */}
              <Card className="border border-[var(--border-subtle)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-serif font-bold text-[var(--text-primary)]">
                      Sample Screened Records (First 15 Valid)
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Pre-ingestion evaluation completed across integrity, velocity, and circular layering heuristics.
                    </p>
                  </div>
                  {previewData.summary.invalid_rows > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-red-400 border-red-900/40"
                    >
                      Inspect {previewData.summary.invalid_rows} Invalid Rows
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-neutral-900/40 text-[var(--text-secondary)] uppercase font-mono">
                        <th className="py-2.5 px-4">Transaction ID</th>
                        <th className="py-2.5 px-4">Sender</th>
                        <th className="py-2.5 px-4">Receiver</th>
                        <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                        <th className="py-2.5 px-4">Channel</th>
                        <th className="py-2.5 px-4 text-center">Screening Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {previewData.sample_valid_rows.map((r, i) => (
                        <tr key={i} className="hover:bg-neutral-800/20">
                          <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                            {r.transaction_id}
                          </td>
                          <td className="py-2.5 px-4">{r.sender_account_id}</td>
                          <td className="py-2.5 px-4">{r.receiver_account_id}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-[var(--text-primary)]">
                            ₹ {Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[var(--text-secondary)]">
                            {r.channel || "WIRE"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                              Validated Candidate
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Remap Columns
                  </Button>
                  <Button variant="primary" onClick={() => setShowConfirmModal(true)}>
                    Confirm Ingestion Batch
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ── STEP 4: Error Inspection ── */}
          {currentStep === 4 && previewData && (
            <Card className="p-6 border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-base font-serif font-bold text-red-400">
                    Row-Level Integrity & Duplicate Exceptions
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Finverse never silently discards invalid rows. Review errors below or download the remediation report.
                  </p>
                </div>
                <Badge variant="critical">
                  {previewData.row_errors.length + previewData.duplicate_preview.length} Total Errors
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-neutral-900/40 text-[var(--text-secondary)] uppercase font-mono">
                      <th className="py-2.5 px-4">Row #</th>
                      <th className="py-2.5 px-4">Transaction ID</th>
                      <th className="py-2.5 px-4">Classification</th>
                      <th className="py-2.5 px-4">Failure Reason</th>
                      <th className="py-2.5 px-4">Remediation Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {[...previewData.row_errors, ...previewData.duplicate_preview].map((err, i) => (
                      <tr key={i} className="hover:bg-neutral-800/20">
                        <td className="py-2.5 px-4 font-mono font-medium text-amber-400">
                          Row {err.row_number}
                        </td>
                        <td className="py-2.5 px-4 font-mono">{err.transaction_id || "—"}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              err.status === "duplicate"
                                ? "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                                : "bg-red-950/40 text-red-300 border border-red-800/40"
                            }`}
                          >
                            {err.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-red-300">{err.reason}</td>
                        <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                          {err.status === "duplicate"
                            ? "Verify duplicate ledger entry or assign unique external ID."
                            : "Correct missing account identifiers or invalid amount in source spreadsheet."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Return to Preview
                </Button>
                <Button variant="primary" onClick={() => setShowConfirmModal(true)}>
                  Proceed to Confirmation
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── STEP 5: Final Results & Commit Feedback ── */}
          {currentStep === 5 && commitResult && (
            <Card className="p-8 border border-emerald-800/40 bg-emerald-950/10 text-center max-w-2xl mx-auto space-y-4">
              <div className="p-4 rounded-full bg-emerald-900/40 text-emerald-300 w-16 h-16 mx-auto flex items-center justify-center border border-emerald-700/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-serif font-bold text-emerald-300">
                Import Batch Committed Successfully
              </h2>
              <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                {commitResult.message}
              </p>

              <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
                <div className="p-2.5 rounded bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[var(--text-muted)]">Imported</div>
                  <div className="text-base font-bold text-emerald-300">{commitResult.imported_rows}</div>
                </div>
                <div className="p-2.5 rounded bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[var(--text-muted)]">Held for Review</div>
                  <div className="text-base font-bold text-purple-300">{commitResult.held_rows}</div>
                </div>
                <div className="p-2.5 rounded bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[var(--text-muted)]">Skipped</div>
                  <div className="text-base font-bold text-amber-300">{commitResult.skipped_rows}</div>
                </div>
                <div className="p-2.5 rounded bg-neutral-900/50 border border-neutral-800">
                  <div className="text-[var(--text-muted)]">Rejected</div>
                  <div className="text-base font-bold text-red-300">{commitResult.rejected_rows}</div>
                </div>
              </div>

              <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
                {commitResult.rejected_rows > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => handleDownloadErrors(commitResult.import_id)}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                    Download Rejected-Rows CSV
                  </Button>
                )}
                <Button variant="primary" onClick={handleResetWizard} className="text-xs">
                  Upload Another File
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 2: IMPORT HISTORY ── */}
      {activeTab === "history" && (
        <Card className="border border-[var(--border-subtle)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-[var(--text-primary)]">
                Import Jobs Audit Trail
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Full chronological history of batch uploads, execution outcomes, and rejected-row reports.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchHistory} disabled={isLoadingHistory}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-neutral-900/40 text-[var(--text-secondary)] uppercase font-mono">
                  <th className="py-3 px-4">Import ID</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Dataset</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Imported</th>
                  <th className="py-3 px-4 text-center">Skipped</th>
                  <th className="py-3 px-4 text-center">Rejected</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 text-right">Error Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--primary-brass)]" />
                      Loading import history...
                    </td>
                  </tr>
                ) : historyJobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)]">
                      No import jobs registered yet.
                    </td>
                  </tr>
                ) : (
                  historyJobs.map((j) => (
                    <tr key={j.import_id} className="hover:bg-neutral-800/20">
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                        {j.import_id}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-primary)]">{j.filename}</td>
                      <td className="py-3 px-4 capitalize font-mono text-[var(--text-secondary)]">
                        {j.dataset_type}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            j.status === "completed"
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                              : j.status === "failed"
                              ? "bg-red-950/40 text-red-300 border border-red-800/40"
                              : "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{j.total_rows}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                        {j.imported_rows}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400">
                        {j.skipped_rows}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-red-400">
                        {j.rejected_rows}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">
                        {j.created_at ? new Date(j.created_at).toLocaleString("en-GB") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {j.has_error_report ? (
                          <button
                            onClick={() => handleDownloadErrors(j.import_id)}
                            className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 ml-auto"
                          >
                            <Download className="w-3.5 h-3.5" />
                            CSV Report
                          </button>
                        ) : (
                          <span className="text-[var(--text-muted)] text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CONFIRMATION MODAL (Step 6) ── */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Ingestion Batch Execution"
      >
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <p>
            You are about to commit <strong className="text-[var(--text-primary)]">{previewData?.summary.valid_rows}</strong> validated transactions from <strong>{previewData?.filename}</strong> into the Finverse ledger.
          </p>

          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Batch Integrity Policy:
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="partial"
                    checked={policy === "partial"}
                    onChange={() => setPolicy("partial")}
                  />
                  <span>Partial (Ingest valid rows; log rejected)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    value="strict"
                    checked={policy === "strict"}
                    onChange={() => setPolicy("strict")}
                  />
                  <span>Strict (Roll back if any row is invalid)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-1">
                Duplicate Record Policy:
              </label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dup_policy"
                    value="skip"
                    checked={duplicatePolicy === "skip"}
                    onChange={() => setDuplicatePolicy("skip")}
                  />
                  <span>Skip Duplicate IDs</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dup_policy"
                    value="reject"
                    checked={duplicatePolicy === "reject"}
                    onChange={() => setDuplicatePolicy("reject")}
                  />
                  <span>Reject Duplicate IDs</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This operation will persist records in the live operational database and emit real-time WebSocket events. All pre-screening risk tags and rule triggers will be recorded.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={isConfirming}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExecuteCommit} disabled={isConfirming}>
              {isConfirming ? "Committing Transactions..." : "Execute Commit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
