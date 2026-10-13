import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { riskMonitorService } from "../services/riskMonitorService";
import { realtimeStream } from "../services/websocketService";
import { RiskMonitorStats, RiskFeedItem, ScreeningResult } from "../types";

export const RiskMonitorPage: React.FC = () => {
  const [stats, setStats] = useState<RiskMonitorStats | null>(null);
  const [feed, setFeed] = useState<RiskFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Manual Screening Modal State
  const [showManualScreenModal, setShowManualScreenModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    transaction_id: "",
    sender_account_id: "ACC-8491",
    receiver_account_id: "ACC-3042",
    sender_name: "Apex Global Trading Ltd",
    receiver_name: "Meridian Horizon LLC",
    amount: 985000,
    currency: "INR",
    channel: "WIRE",
    location: "Mumbai, IN",
    save_to_ledger: false,
  });
  const [isScreening, setIsScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [screenFeedback, setScreenFeedback] = useState<string | null>(null);

  // Override Decision Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedTxForOverride, setSelectedTxForOverride] = useState<RiskFeedItem | null>(null);
  const [overrideAction, setOverrideAction] = useState<"allowed" | "held" | "blocked">("allowed");
  const [overrideReason, setOverrideReason] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  const fetchStatsAndFeed = async () => {
    setIsLoading(true);
    try {
      const [sData, fData] = await Promise.all([
        riskMonitorService.getRiskStats(),
        riskMonitorService.getRiskFeed(filterRisk, filterAction, 50),
      ]);
      setStats(sData);
      setFeed(fData);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndFeed();
  }, [filterRisk, filterAction]);

  // Connect to live WebSocket events
  useEffect(() => {
    const unsub = realtimeStream.onTransaction(() => {
      fetchStatsAndFeed();
    });
    return () => unsub();
  }, []);


  const handleRunScreening = async (commit: boolean) => {
    setIsScreening(true);
    setScreenFeedback(null);
    try {
      const res = await riskMonitorService.screenTransaction({
        ...manualForm,
        save_to_ledger: commit,
      });
      setScreeningResult(res.screening_result);
      if (commit) {
        if (res.committed) {
          setScreenFeedback("Transaction cleared pre-ingestion screening and committed to ledger!");
          fetchStatsAndFeed();
        } else {
          setScreenFeedback(`Rejection: ${res.rejection_reason || "Screening gate blocked transaction."}`);
        }
      }
    } catch (err: any) {
      setScreenFeedback(err?.message || "Screening failed.");
    } finally {
      setIsScreening(false);
    }
  };

  const handleRescreen = async (txId: string) => {
    try {
      await riskMonitorService.rescreenTransaction(txId);
      fetchStatsAndFeed();
    } catch (err: any) {
      alert(err?.message || "Re-screening failed.");
    }
  };

  const handleApplyOverride = async () => {
    if (!selectedTxForOverride || !overrideReason.trim()) return;
    setIsOverriding(true);
    try {
      // Create mock or real assessment override
      await riskMonitorService.overrideDecision(
        `SA-${selectedTxForOverride.transaction_id}`,
        overrideAction,
        overrideReason
      );
      setShowOverrideModal(false);
      setSelectedTxForOverride(null);
      setOverrideReason("");
      fetchStatsAndFeed();
    } catch {
      // fallback
      setShowOverrideModal(false);
    } finally {
      setIsOverriding(false);
    }
  };

  const filteredFeed = feed.filter((item) => {
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
            <span className="p-2 rounded-lg" style={{ background: "rgba(192,57,43,0.15)", color: "#FF7B72" }}>
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
              Real-Time Pre-Ingestion Risk Monitor
            </h1>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Continuous surveillance gate evaluating candidate transactions across integrity, structuring velocity, and circular layering ring heuristics before persistence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchStatsAndFeed}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setScreeningResult(null);
              setScreenFeedback(null);
              setShowManualScreenModal(true);
            }}
            className="flex items-center gap-1.5 text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Manual Screening Gate
          </Button>
        </div>
      </div>

      {/* ── KPI Telemetry Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border border-[var(--border-subtle)]">
          <div className="text-[11px] text-[var(--text-secondary)] uppercase">Total Screened</div>
          <div className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1">
            {stats ? stats.total_screened.toLocaleString() : "—"}
          </div>
        </Card>

        <Card className="p-3 border border-emerald-900/40 bg-emerald-950/10">
          <div className="text-[11px] text-emerald-400 uppercase">Accepted / Allowed</div>
          <div className="text-xl font-serif font-bold text-emerald-300 mt-1">
            {stats ? stats.accepted.toLocaleString() : "—"}
          </div>
        </Card>

        <Card className="p-3 border border-purple-900/40 bg-purple-950/10">
          <div className="text-[11px] text-purple-400 uppercase">Held for Review</div>
          <div className="text-xl font-serif font-bold text-purple-300 mt-1">
            {stats ? stats.held.toLocaleString() : "—"}
          </div>
        </Card>

        <Card className="p-3 border border-red-900/40 bg-red-950/10">
          <div className="text-[11px] text-red-400 uppercase">Blocked / Quarantined</div>
          <div className="text-xl font-serif font-bold text-red-300 mt-1">
            {stats ? stats.blocked.toLocaleString() : "—"}
          </div>
        </Card>

        <Card className="p-3 border border-amber-900/40 bg-amber-950/10">
          <div className="text-[11px] text-amber-400 uppercase">Avg Risk Score</div>
          <div className="text-xl font-serif font-bold text-amber-300 mt-1">
            {stats ? `${stats.average_risk_score}/100` : "—"}
          </div>
        </Card>

        <Card className="p-3 border border-[var(--border-subtle)]">
          <div className="text-[11px] text-[var(--text-secondary)] uppercase">Engine Status</div>
          <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE GATE
          </div>
        </Card>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <Card className="p-4 border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="text-xs rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
          >
            <option value="all">All Mandated Actions</option>
            <option value="allow">Allow</option>
            <option value="review">Review</option>
            <option value="block">Block</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search feed records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-md pl-9 pr-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
          >
          </input>
        </div>
      </Card>

      {/* ── Real-Time Screened Stream Table ── */}
      <Card className="border border-[var(--border-subtle)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="text-base font-serif font-bold text-[var(--text-primary)]">
            Screened Transactions & Decision Telemetry
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {filteredFeed.length} feed events displayed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-neutral-900/40 text-[var(--text-secondary)] uppercase font-mono">
                <th className="py-3 px-4">TX ID & Timestamp</th>
                <th className="py-3 px-4">Counterparties</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Score / Tier</th>
                <th className="py-3 px-4">Triggered Rules & Typologies</th>
                <th className="py-3 px-4">Screening Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--primary-brass)]" />
                    Synchronizing screening stream...
                  </td>
                </tr>
              ) : filteredFeed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFeed.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-neutral-800/20">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-semibold text-[var(--text-primary)]">{tx.transaction_id}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleString("en-GB") : "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[var(--text-primary)]">
                        {tx.sender_name || tx.sender_account_id} → {tx.receiver_name || tx.receiver_account_id}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">
                        {tx.sender_account_id} • {tx.receiver_account_id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--text-primary)]">
                      ₹ {Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                        {tx.risk_score ?? "0"} ({tx.risk_level?.toUpperCase()})
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {tx.rules_triggered && tx.rules_triggered.length > 0 ? (
                        <div className="space-y-1">
                          {tx.rules_triggered.slice(0, 2).map((rule, idx) => (
                            <div key={idx} className="text-[11px] flex items-center gap-1.5 text-amber-300">
                              <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                                {rule.rule_id}
                              </span>
                              <span className="truncate">{rule.name}</span>
                            </div>
                          ))}
                          {tx.rules_triggered.length > 2 && (
                            <div className="text-[10px] text-[var(--text-muted)]">
                              +{tx.rules_triggered.length - 2} more rules
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">Normal retail flow</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                          tx.screening_status === "quarantined"
                            ? "bg-red-950/50 text-red-300 border border-red-800/40"
                            : tx.screening_status === "pending_review"
                            ? "bg-purple-950/50 text-purple-300 border border-purple-800/40"
                            : "bg-emerald-950/50 text-emerald-300 border border-emerald-800/40"
                        }`}
                      >
                        {tx.screening_status || tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRescreen(tx.transaction_id)}
                          title="Re-screen under latest rules"
                          className="p-1 rounded hover:bg-neutral-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/transactions/${tx.transaction_id}`}
                          title="Open investigation ledger"
                          className="p-1 rounded hover:bg-neutral-800 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── MANUAL TRANSACTION PRE-SCREENING MODAL ── */}
      <Modal
        isOpen={showManualScreenModal}
        onClose={() => setShowManualScreenModal(false)}
        title="Manual Transaction Pre-Ingestion Screening Gate"
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            Evaluate a candidate transaction before saving it to the ledger. Test explainable rule contribution and AML topologies in real-time.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-secondary)] mb-1">
                Sender Account ID:
              </label>
              <input
                type="text"
                value={manualForm.sender_account_id}
                onChange={(e) => setManualForm({ ...manualForm, sender_account_id: e.target.value })}
                className="w-full rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--text-secondary)] mb-1">
                Receiver Account ID:
              </label>
              <input
                type="text"
                value={manualForm.receiver_account_id}
                onChange={(e) => setManualForm({ ...manualForm, receiver_account_id: e.target.value })}
                className="w-full rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--text-secondary)] mb-1">
                Amount (INR):
              </label>
              <input
                type="number"
                value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-[var(--text-secondary)] mb-1">
                Channel:
              </label>
              <select
                value={manualForm.channel}
                onChange={(e) => setManualForm({ ...manualForm, channel: e.target.value })}
                className="w-full rounded-md px-3 py-1.5 border bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none"
              >
                <option value="WIRE">WIRE Transfer</option>
                <option value="SWIFT">SWIFT International</option>
                <option value="UPI">UPI Instant</option>
                <option value="CRYPTO_GATEWAY">Unregulated Crypto Gateway</option>
              </select>
            </div>
          </div>

          {/* Screening Results Panel */}
          {screeningResult && (
            <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-[var(--text-primary)]">
                  Evaluation Verdict
                </span>
                <Badge
                  variant={
                    screeningResult.risk_level === "critical"
                      ? "critical"
                      : screeningResult.risk_level === "high"
                      ? "high"
                      : screeningResult.risk_level === "medium"
                      ? "medium"
                      : "low"
                  }
                >
                  Score: {screeningResult.risk_score}/100 ({screeningResult.risk_level.toUpperCase()})
                </Badge>
              </div>

              <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <span>Mandated Action:</span>
                <strong className="text-[var(--text-primary)] uppercase">
                  {screeningResult.recommended_action}
                </strong>
              </div>

              {screeningResult.rules_triggered.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Triggered Explainable Rules:
                  </div>
                  {screeningResult.rules_triggered.map((rule, idx) => (
                    <div key={idx} className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px]">
                      <div className="font-semibold text-amber-300 flex items-center justify-between">
                        <span>{rule.rule_id}: {rule.name}</span>
                        <span>+{rule.contribution} pts</span>
                      </div>
                      <p className="text-[var(--text-secondary)] mt-0.5">{rule.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {screenFeedback && (
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
              {screenFeedback}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => handleRunScreening(false)}
              disabled={isScreening}
            >
              {isScreening ? "Evaluating..." : "Dry Run Pre-Screen"}
            </Button>
            <Button
              variant="primary"
              onClick={() => handleRunScreening(true)}
              disabled={isScreening}
            >
              Gate & Commit to Ledger
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
