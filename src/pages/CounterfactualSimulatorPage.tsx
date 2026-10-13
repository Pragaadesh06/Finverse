import React, { useEffect, useState } from "react";
import {
  GitCompare,
  Sliders,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
} from "lucide-react";
import {
  counterfactualService,
  CounterfactualResponse,
} from "../services/counterfactualService";
import { transactionService } from "../services/transactionService";
import { Transaction } from "../types";
import { formatCurrency } from "../lib/utils";

export const CounterfactualSimulatorPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string>("TX-2026-98104");
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);

  // Scenario modifications
  const [amount, setAmount] = useState<number>(45000);
  const [channel, setChannel] = useState<string>("UPI");
  const [ipCountry, setIpCountry] = useState<string>("IN");
  const [merchantCategory, setMerchantCategory] = useState<string>("Retail Grocery");

  // Threshold adjustments
  const [structuringThreshold, setStructuringThreshold] = useState<number>(1000000);

  const [isRunning, setIsRunning] = useState(false);
  const [simResult, setSimResult] = useState<CounterfactualResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent transactions to choose as baseline
  useEffect(() => {
    const fetchBaselineCandidates = async () => {
      setIsLoadingTxs(true);
      try {
        const res = await transactionService.getTransactions({ limit: 20 });
        setTransactions(res.items);
        if (res.items.length > 0 && !selectedTxId) {
          setSelectedTxId(res.items[0].transaction_id);
          setAmount(res.items[0].amount);
        }
      } catch (err) {
        console.error("Failed to load baseline transactions:", err);
      } finally {
        setIsLoadingTxs(false);
      }
    };
    fetchBaselineCandidates();
  }, []);

  // Update form amount when baseline changes
  const handleBaselineChange = (txId: string) => {
    setSelectedTxId(txId);
    const found = transactions.find((t) => t.transaction_id === txId);
    if (found) {
      setAmount(found.amount);
      setChannel(found.channel || "WIRE");
      setIpCountry(found.ip_country || "IN");
    }
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await counterfactualService.runSimulation({
        baseline_transaction_id: selectedTxId,
        modifications: {
          amount: Number(amount),
          channel,
          ip_country: ipCountry,
          merchant_category: merchantCategory,
        },
        rule_threshold_overrides: {
          structuring_limit: structuringThreshold,
        },
      });
      setSimResult(res);
    } catch (err: any) {
      setError(err?.message || "Simulation execution failed. Check inputs.");
    } finally {
      setIsRunning(false);
    }
  };

  // Run initial simulation on mount
  useEffect(() => {
    handleRunSimulation();
  }, [selectedTxId]);

  const handleReset = () => {
    const found = transactions.find((t) => t.transaction_id === selectedTxId);
    if (found) {
      setAmount(found.amount);
      setChannel(found.channel || "WIRE");
      setIpCountry(found.ip_country || "IN");
      setMerchantCategory("Retail Grocery");
    } else {
      setAmount(45000);
      setChannel("UPI");
      setIpCountry("IN");
    }
    setStructuringThreshold(1000000);
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-[#2E7D52] dark:text-[#8EBE95]";
    if (score < 60) return "text-[#8A7034] dark:text-[#E2C582]";
    if (score < 80) return "text-[#C2440A] dark:text-[#FB923C]";
    return "text-[#873C43] dark:text-[#F87171]";
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "allow":
        return "bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95] border-[#738875]/30";
      case "step_up_verification":
        return "bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582] border-[#B49A63]/30";
      case "manual_review":
        return "bg-[#C2440A]/15 text-[#C2440A] dark:text-[#FB923C] border-[#C2440A]/30";
      case "hold_for_review":
      case "block":
        return "bg-[#873C43]/15 text-[#873C43] dark:text-[#F87171] border-[#873C43]/30";
      default:
        return "bg-[#DCD8CE]/40 text-[#5A6356] border-[#DCD8CE]";
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#B49A63] bg-[#B49A63]/15 px-2.5 py-0.5 rounded-full">
              Orchestration Sandbox
            </span>
            <span className="text-xs text-[#5A6356] dark:text-[#DCD8CE] font-mono">
              Engine: Isolation Forest v1.0 + Rule Graph v3.4
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            Counterfactual Transaction Simulator
          </h1>
          <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
            Test hypothetical scenario adjustments against production risk thresholds without altering database ledger records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] text-xs font-medium text-[#5A6356] hover:text-[#242923] dark:hover:text-[#F7F4EC] transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Parameters
          </button>
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-xl bg-[#193C32] dark:bg-[#EEE8DA] text-white dark:text-[#102A23] text-xs font-semibold hover:bg-[#102A23] dark:hover:bg-white transition flex items-center gap-2 shadow-sm"
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#B49A63]" />
            ) : (
              <Play className="w-4 h-4 text-[#B49A63]" />
            )}
            Run Counterfactual Analysis
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#873C43]/10 border border-[#873C43]/30 text-sm text-[#873C43] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Controls (1 column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
            <h2 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#B49A63]" />
              Scenario Parameters
            </h2>
            <span className="text-[10px] text-[#5A6356] uppercase tracking-wider font-mono">
              In-Memory
            </span>
          </div>

          {/* Baseline Transaction Picker */}
          <div>
            <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1.5">
              Target Baseline Transaction
            </label>
            <select
              value={selectedTxId}
              onChange={(e) => handleBaselineChange(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] font-mono focus:outline-none"
            >
              {transactions.map((tx) => (
                <option key={tx.transaction_id} value={tx.transaction_id}>
                  {tx.transaction_id} — {tx.sender_name || tx.sender_account_id} (₹{tx.amount.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Slider & Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#5A6356] dark:text-[#DCD8CE]">
                Hypothetical Amount
              </span>
              <span className="font-mono font-bold text-[#102A23] dark:text-[#F7F4EC]">
                {formatCurrency(amount, "INR")}
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="2500000"
              step="5000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-[#193C32] dark:accent-[#B49A63] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5A6356] font-mono">
              <span>₹5,000</span>
              <span>₹10,00,000 (CTR)</span>
              <span>₹25,00,000</span>
            </div>
          </div>

          {/* Payment Channel */}
          <div>
            <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
              Payment Rail / Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
            >
              <option value="UPI">UPI (Unified Payments Interface)</option>
              <option value="IMPS">IMPS (Immediate Payment Service)</option>
              <option value="NEFT">NEFT (National Electronic Fund Transfer)</option>
              <option value="RTGS">RTGS (Real-Time Gross Settlement)</option>
              <option value="WIRE">Domestic Wire Transfer</option>
              <option value="SWIFT">SWIFT International Wire</option>
              <option value="CRYPTO_GATEWAY">Virtual Asset Crypto Gateway</option>
            </select>
          </div>

          {/* Origin / Proxy IP Country */}
          <div>
            <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
              Session Jurisdiction / Origin
            </label>
            <select
              value={ipCountry}
              onChange={(e) => setIpCountry(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
            >
              <option value="IN">IN — India (Domestic Verified)</option>
              <option value="AE">AE — United Arab Emirates</option>
              <option value="SG">SG — Singapore</option>
              <option value="GB">GB — United Kingdom</option>
              <option value="CY">CY — Cyprus (Secrecy Proxy)</option>
              <option value="PA">PA — Panama (High Secrecy Haven)</option>
              <option value="RU">RU — Russian Federation</option>
            </select>
          </div>

          {/* Merchant Category */}
          <div>
            <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
              Counterparty Merchant Category
            </label>
            <select
              value={merchantCategory}
              onChange={(e) => setMerchantCategory(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
            >
              <option value="Retail Grocery">Retail Grocery / Essential Consumer</option>
              <option value="Financial Services">Commercial Financial Services</option>
              <option value="Corporate Treasury">Corporate Treasury & Payroll</option>
              <option value="Offshore Advisory">Offshore Advisory / Wealth Trust</option>
              <option value="Virtual Assets">Virtual Digital Assets / Crypto Desk</option>
              <option value="High Value Luxury">Jewellery / Luxury Bullion</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEE8DA]/40 dark:bg-[#102A23]/40 border border-[#DCD8CE] dark:border-[#24483C] text-[11px] text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed">
            <span className="font-semibold text-[#193C32] dark:text-[#B49A63]">Non-Mutation Guarantee:</span> Original ledger row remains identical in database. All delta calculations are executed in an ephemeral sandbox.
          </div>
        </div>

        {/* Side-by-Side Comparison (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Baseline Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6356] dark:text-[#DCD8CE]">
                  Baseline (Production)
                </span>
                <span className="font-mono text-xs text-[#5A6356]">
                  {simResult?.baseline.transaction_id || selectedTxId}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`font-serif text-4xl font-bold ${getScoreColor(simResult?.baseline.risk_score || 0)}`}>
                    {simResult ? simResult.baseline.risk_score : "—"}
                    <span className="text-xs text-[#5A6356] font-normal ml-1">/100</span>
                  </div>
                  <span className="text-xs text-[#5A6356] capitalize">
                    {simResult?.baseline.risk_level || "Assessing"} Risk
                  </span>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getActionBadge(simResult?.baseline.recommended_action || "allow")}`}>
                    {simResult?.baseline.recommended_action.replace("_", " ").toUpperCase() || "ALLOW"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#5A6356] dark:text-[#DCD8CE] border-t border-[#DCD8CE]/40 pt-3">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-mono font-medium text-[#242923] dark:text-[#F7F4EC]">
                    {simResult ? formatCurrency(simResult.baseline.amount, "INR") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Channel:</span>
                  <span className="text-[#242923] dark:text-[#F7F4EC]">
                    {simResult?.baseline.channel || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ML Anomaly Score:</span>
                  <span className="font-mono font-medium text-[#242923] dark:text-[#F7F4EC]">
                    {simResult?.baseline.ml_assessment?.ml_score ?? "—"}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Scenario Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border-2 border-[#B49A63]/60 dark:border-[#B49A63]/50 shadow-md space-y-4 relative">
              <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#B49A63]">
                  Counterfactual Scenario
                </span>
                <span className="text-[10px] bg-[#B49A63]/15 text-[#B49A63] font-semibold px-2 py-0.5 rounded-full">
                  Hypothetical
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`font-serif text-4xl font-bold ${getScoreColor(simResult?.scenario.risk_score || 0)}`}>
                    {simResult ? simResult.scenario.risk_score : "—"}
                    <span className="text-xs text-[#5A6356] font-normal ml-1">/100</span>
                  </div>
                  <span className="text-xs text-[#5A6356] capitalize">
                    {simResult?.scenario.risk_level || "Simulating"} Risk
                  </span>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getActionBadge(simResult?.scenario.recommended_action || "allow")}`}>
                    {simResult?.scenario.recommended_action.replace("_", " ").toUpperCase() || "ALLOW"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#5A6356] dark:text-[#DCD8CE] border-t border-[#DCD8CE]/40 pt-3">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-mono font-medium text-[#242923] dark:text-[#F7F4EC]">
                    {simResult ? formatCurrency(simResult.scenario.amount, "INR") : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Channel:</span>
                  <span className="text-[#242923] dark:text-[#F7F4EC]">{channel}</span>
                </div>
                <div className="flex justify-between">
                  <span>ML Anomaly Score:</span>
                  <span className="font-mono font-medium text-[#242923] dark:text-[#F7F4EC]">
                    {simResult?.scenario.ml_assessment?.ml_score ?? "—"}/100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delta & Explanation Card */}
          {simResult && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
                <h3 className="font-serif text-base font-semibold text-[#102A23] dark:text-[#F7F4EC] flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-[#B49A63]" />
                  Comparative Decision Rationale
                </h3>
                <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                  <span>Score Delta:</span>
                  <span
                    className={`flex items-center ${
                      simResult.score_delta < 0
                        ? "text-[#2E7D52] dark:text-[#8EBE95]"
                        : simResult.score_delta > 0
                        ? "text-[#873C43] dark:text-[#F87171]"
                        : "text-[#5A6356]"
                    }`}
                  >
                    {simResult.score_delta < 0 ? (
                      <TrendingDown className="w-4 h-4 mr-0.5" />
                    ) : simResult.score_delta > 0 ? (
                      <TrendingUp className="w-4 h-4 mr-0.5" />
                    ) : null}
                    {simResult.score_delta > 0 ? `+${simResult.score_delta}` : simResult.score_delta} pts
                  </span>
                </div>
              </div>

              {/* Natural Language Explanation */}
              <div className="p-4 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/50 dark:border-[#24483C] text-xs text-[#242923] dark:text-[#F7F4EC] leading-relaxed font-sans">
                <strong>Analysis Summary: </strong>
                {simResult.delta.explanation}
              </div>

              {/* Rules Eliminated vs Introduced */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Eliminated Rules */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#2E7D52] dark:text-[#8EBE95] uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Risk Rules Eliminated ({simResult.delta.rules_eliminated.length})
                  </span>
                  {simResult.delta.rules_eliminated.length === 0 ? (
                    <div className="text-[11px] text-[#5A6356] p-3 rounded-lg bg-[#EEE8DA]/30">
                      No baseline rules were deactivated.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {simResult.delta.rules_eliminated.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[#738875]/10 border border-[#738875]/25 text-xs text-[#2E7D52] dark:text-[#8EBE95]">
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-[10px] text-[#5A6356] mt-0.5">{r.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Introduced Rules */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#873C43] dark:text-[#F87171] uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    New Rules Triggered ({simResult.delta.rules_introduced.length})
                  </span>
                  {simResult.delta.rules_introduced.length === 0 ? (
                    <div className="text-[11px] text-[#5A6356] p-3 rounded-lg bg-[#EEE8DA]/30">
                      No new risk rules were triggered.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {simResult.delta.rules_introduced.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[#873C43]/10 border border-[#873C43]/25 text-xs text-[#873C43] dark:text-[#F87171]">
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-[10px] text-[#5A6356] mt-0.5">{r.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Machine Learning Model Attribution Badge */}
              <div className="border-t border-[#DCD8CE]/40 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5A6356] gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#B49A63]" />
                  <span>Model: <strong>{simResult.scenario.ml_assessment?.model_version || "IsolationForest-v1.0"}</strong></span>
                </div>
                <span className="text-[11px] font-mono">
                  Scenario Audit Reference: {simResult.scenario_id}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CounterfactualSimulatorPage;
