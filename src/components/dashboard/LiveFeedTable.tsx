import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Transaction } from "../../types";
import { formatCurrency, formatRelativeTime } from "../../lib/utils";
import { RiskBadge, ActionBadge } from "../ui/Badge";
import { SearchBar } from "../ui/SearchBar";
import { ArrowUpRight, ExternalLink } from "lucide-react";

interface LiveFeedTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export const LiveFeedTable: React.FC<LiveFeedTableProps> = ({ transactions, isLoading }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      tx.sender_account_id.toLowerCase().includes(search.toLowerCase()) ||
      tx.receiver_account_id.toLowerCase().includes(search.toLowerCase()) ||
      (tx.sender_name && tx.sender_name.toLowerCase().includes(search.toLowerCase())) ||
      (tx.receiver_name && tx.receiver_name.toLowerCase().includes(search.toLowerCase()));

    const matchesRisk = selectedRisk === "all" || tx.risk_level === selectedRisk;
    return matchesSearch && matchesRisk;
  });

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-soft)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#2E7D52" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "#2E7D52" }}
            />
          </span>
          <h3
            className="text-sm font-bold"
            style={{
              color: "var(--color-ink)",
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            Live Ingestion Feed
          </h3>
          <span
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded"
            style={{
              background: "var(--color-accent-muted)",
              color: "var(--color-accent)",
              border: "1px solid rgba(46,125,82,0.20)",
            }}
          >
            Streaming
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-44 sm:w-56">
            <SearchBar
              value={search}
              onChangeValue={setSearch}
              placeholder="Filter feed…"
            />
          </div>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="text-xs rounded-xl px-2.5 py-2 transition-all"
            style={{
              background: "var(--color-bg-card)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-border)",
              fontFamily: "inherit",
            }}
          >
            <option value="all">All Risks</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => navigate("/transactions")}
            className="text-xs font-semibold flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap transition-all"
            style={{
              color: "var(--color-accent-2)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-card)",
            }}
          >
            View All <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{
                color: "var(--color-ink-3)",
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-bg-soft)",
              }}
            >
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">Sender / Counterparty</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4 text-center">Risk</th>
              <th className="py-3 px-4 text-center">Decision</th>
              <th className="py-3 px-4 text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-3.5 px-4">
                      <div className="skeleton h-3 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-sm"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  No transactions match current filters.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 12).map((tx) => (
                <tr
                  key={tx.transaction_id}
                  onClick={() => navigate(`/transactions/${tx.transaction_id}`)}
                  className="cursor-pointer group transition-colors"
                  style={{ borderBottom: "1px solid var(--color-border-soft)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--color-accent-muted)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  <td
                    className="py-3 px-4 font-mono text-[11px] whitespace-nowrap"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {formatRelativeTime(tx.timestamp)}
                  </td>

                  <td
                    className="py-3 px-4 font-mono font-semibold text-[11px] whitespace-nowrap transition-colors"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {tx.transaction_id}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span
                        className="font-semibold text-xs truncate max-w-[160px]"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {tx.sender_name || tx.sender_account_id}
                      </span>
                      <span
                        className="text-[11px] truncate max-w-[160px]"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        → {tx.receiver_name || tx.receiver_account_id}
                      </span>
                    </div>
                  </td>

                  <td
                    className="py-3 px-4 text-right font-mono font-semibold text-xs whitespace-nowrap"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {formatCurrency(tx.amount, "INR")}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <RiskBadge level={tx.risk_level} score={tx.risk_score} />
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <ActionBadge action={tx.recommended_action} />
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/transactions/${tx.transaction_id}`);
                      }}
                      className="p-1 rounded-lg transition-colors"
                      style={{ color: "var(--color-ink-3)" }}
                      title="Inspect Transaction"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
