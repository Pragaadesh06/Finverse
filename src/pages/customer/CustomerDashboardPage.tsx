import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  FileText,
  Download,
  Info,
  RefreshCw,
  ExternalLink,
  Lock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { customerService, CustomerOverviewResponse } from "../../services/customerService";
import { formatCurrency, formatDateTime } from "../../lib/utils";

export const CustomerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<CustomerOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerService.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load account activity.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95] border-[#738875]/30";
      case "Standard Safety Review":
        return "bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582] border-[#B49A63]/30";
      case "In Verification":
        return "bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#93C5FD] border-[#3B82F6]/30";
      case "Declined":
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
              Personal Banking Portal
            </span>
            <span className="text-xs text-[#5A6356] dark:text-[#DCD8CE] font-mono">
              Account: {data?.account_id || user?.customerAccountId || "ACC-5120"}
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            Welcome, {user?.name || "Client"}
          </h1>
          <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
            Here is a private summary of your recent payments, balances, and security verification checks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] bg-white dark:bg-[#193C32] text-[#242923] dark:text-[#F7F4EC] hover:bg-[#EEE8DA]/50 transition"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <a
            href={customerService.getExportDownloadUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] bg-white dark:bg-[#193C32] text-xs font-medium text-[#242923] dark:text-[#F7F4EC] hover:bg-[#EEE8DA]/50 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-[#B49A63]" />
            Export Statement
          </a>
          <Link
            to="/customer/disputes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#873C43] hover:bg-[#6e2d33] text-white text-xs font-medium transition shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Suspicious Charge
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#873C43]/10 border border-[#873C43]/30 text-sm text-[#873C43] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOverview} className="underline text-xs ml-4">Retry</button>
        </div>
      )}

      {/* KPI Activity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#5A6356] dark:text-[#DCD8CE] mb-2">
            <span>Settled Inflow</span>
            <span className="p-1.5 rounded-lg bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95]">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            {data ? formatCurrency(data.summary.total_inflow_inr, "INR") : "—"}
          </div>
          <span className="text-[11px] text-[#5A6356] dark:text-[#DCD8CE] mt-1 block font-sans">
            Deposits & transfers received
          </span>
        </div>

        {/* Total Outflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#5A6356] dark:text-[#DCD8CE] mb-2">
            <span>Settled Outflow</span>
            <span className="p-1.5 rounded-lg bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582]">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            {data ? formatCurrency(data.summary.total_outflow_inr, "INR") : "—"}
          </div>
          <span className="text-[11px] text-[#5A6356] dark:text-[#DCD8CE] mt-1 block font-sans">
            Dispatched transfers & payments
          </span>
        </div>

        {/* Total Transactions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#5A6356] dark:text-[#DCD8CE] mb-2">
            <span>Transaction Count</span>
            <span className="p-1.5 rounded-lg bg-[#193C32]/10 dark:bg-[#F7F4EC]/10 text-[#193C32] dark:text-[#F7F4EC]">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            {data ? data.summary.total_transactions : "—"}
          </div>
          <span className="text-[11px] text-[#5A6356] dark:text-[#DCD8CE] mt-1 block font-sans">
            Total authorized account activities
          </span>
        </div>

        {/* Active Disputes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#5A6356] dark:text-[#DCD8CE] mb-2">
            <span>Disputes & Inquiries</span>
            <span className={`p-1.5 rounded-lg ${data && data.summary.active_disputes > 0 ? "bg-[#873C43]/15 text-[#873C43]" : "bg-[#738875]/15 text-[#2E7D52]"}`}>
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
            {data ? data.summary.active_disputes : "0"}
          </div>
          <span className="text-[11px] text-[#5A6356] dark:text-[#DCD8CE] mt-1 block font-sans">
            {data && data.summary.active_disputes > 0 ? "Active security inquiries" : "No open disputes"}
          </span>
        </div>
      </div>

      {/* Main Grid: Recent Transactions & Safety Status Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions List (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-[#102A23] dark:text-[#F7F4EC]">
              Recent Activity
            </h2>
            <Link
              to="/customer/transactions"
              className="text-xs font-medium text-[#193C32] dark:text-[#B49A63] hover:underline flex items-center gap-1"
            >
              View Full History <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#5A6356]">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#B49A63]" />
                Retrieving your encrypted transaction ledger...
              </div>
            ) : !data?.recent_transactions || data.recent_transactions.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#5A6356] dark:text-[#DCD8CE]">
                No transaction records on this account yet.
              </div>
            ) : (
              <div className="divide-y divide-[#DCD8CE]/60 dark:divide-[#24483C]">
                {data.recent_transactions.map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="p-4.5 flex items-center justify-between hover:bg-[#F7F4EC]/40 dark:hover:bg-[#102A23]/30 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          tx.direction === "inflow"
                            ? "bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95]"
                            : "bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582]"
                        }`}
                      >
                        {tx.direction === "inflow" ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#242923] dark:text-[#F7F4EC]">
                          {tx.counterparty}
                        </div>
                        <div className="text-xs text-[#5A6356] dark:text-[#DCD8CE] flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px]">{tx.transaction_id}</span>
                          <span>•</span>
                          <span>{tx.channel}</span>
                          <span>•</span>
                          <span>{tx.timestamp ? formatDateTime(tx.timestamp) : "Recently"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span
                        className={`text-sm font-semibold font-mono ${
                          tx.direction === "inflow"
                            ? "text-[#2E7D52] dark:text-[#8EBE95]"
                            : "text-[#242923] dark:text-[#F7F4EC]"
                        }`}
                      >
                        {tx.direction === "inflow" ? "+" : "-"}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Guide & Customer Protection Card (1 column) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#193C32] border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#102A23] dark:text-[#F7F4EC] mb-4">
              <Info className="w-4 h-4 text-[#B49A63]" />
              Understanding Verification Statuses
            </div>
            <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] mb-4 font-sans leading-relaxed">
              Every payment is subject to banking network settlement standards and automated safety checks:
            </p>
            <div className="space-y-3.5">
              {(data?.status_guide || []).map((guide, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 border border-[#DCD8CE]/50 dark:border-[#24483C]/60">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(guide.status)}`}>
                      {guide.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed">
                    {guide.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#EEE8DA]/40 dark:bg-[#102A23]/40 border border-[#DCD8CE] dark:border-[#24483C]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#193C32] dark:text-[#B49A63] mb-2">
              <Lock className="w-4 h-4" />
              Account Protection Guarantee
            </div>
            <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] leading-relaxed font-sans">
              Notice a transaction you didn't initiate? Submit a dispute in seconds. Our fraud resolution desk immediately places a temporary hold on associated settlement clearing.
            </p>
            <Link
              to="/customer/disputes"
              className="mt-3 inline-block text-xs font-semibold text-[#873C43] hover:underline"
            >
              Report an unauthorized charge →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
