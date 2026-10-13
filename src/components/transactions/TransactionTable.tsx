import React from "react";
import { useNavigate } from "react-router-dom";
import { Transaction } from "../../types";
import { formatCurrency, formatDateTime, formatRelativeTime } from "../../lib/utils";
import { RiskBadge, ActionBadge } from "../ui/Badge";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/Button";

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  sortField: "timestamp" | "amount" | "risk_score";
  sortDirection: "asc" | "desc";
  onSortChange: (field: "timestamp" | "amount" | "risk_score") => void;
  onResetFilters: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  sortField,
  sortDirection,
  onSortChange,
  onResetFilters,
}) => {
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const renderSortIcon = (field: "timestamp" | "amount" | "risk_score") => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 inline" style={{ color: "var(--color-gold)" }} />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 inline" style={{ color: "var(--color-gold)" }} />
    );
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
      }}
    >
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-bg-soft)",
                color: "var(--color-ink-2)",
              }}
            >
              <th
                className="py-3.5 px-4 cursor-pointer select-none hover:text-ink transition-colors"
                onClick={() => onSortChange("timestamp")}
              >
                Timestamp {renderSortIcon("timestamp")}
              </th>
              <th className="py-3.5 px-4">Transaction ID</th>
              <th className="py-3.5 px-4">Sender Account</th>
              <th className="py-3.5 px-4">Receiver Account</th>
              <th className="py-3.5 px-4">Channel</th>
              <th
                className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-ink transition-colors"
                onClick={() => onSortChange("amount")}
              >
                Amount {renderSortIcon("amount")}
              </th>
              <th
                className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-ink transition-colors"
                onClick={() => onSortChange("risk_score")}
              >
                Risk Score {renderSortIcon("risk_score")}
              </th>
              <th className="py-3.5 px-4 text-center">Action Decision</th>
              <th className="py-3.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs" style={{ borderColor: "var(--color-border)" }}>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={9} className="py-4 px-4">
                    <div
                      className="h-4 rounded w-full"
                      style={{ background: "var(--color-bg-soft)" }}
                    />
                  </td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center" style={{ color: "var(--color-ink-2)" }}>
                  <Inbox className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-ink-3)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    No transactions found
                  </p>
                  <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--color-ink-2)" }}>
                    Try refining your search query, adjusting the risk level, or clearing all filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResetFilters}
                    className="mt-4"
                  >
                    Reset Filter Query
                  </Button>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.transaction_id}
                  onClick={() => navigate(`/transactions/${tx.transaction_id}`)}
                  className="table-row-hover cursor-pointer group"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--color-ink-2)" }}>
                    <div>{formatDateTime(tx.timestamp)}</div>
                    <div className="text-[10px]" style={{ color: "var(--color-ink-3)" }}>
                      ({formatRelativeTime(tx.timestamp)})
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
                    <span className="group-hover:underline" style={{ color: "var(--color-accent-2)" }}>
                      {tx.transaction_id}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold truncate max-w-[170px]" style={{ color: "var(--color-ink)" }}>
                      {tx.sender_name || tx.sender_account_id}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: "var(--color-ink-3)" }}>
                      {tx.sender_account_id}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold truncate max-w-[170px]" style={{ color: "var(--color-ink)" }}>
                      {tx.receiver_name || tx.receiver_account_id}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: "var(--color-ink-3)" }}>
                      {tx.receiver_account_id}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background: "var(--color-bg-soft)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-ink-2)",
                      }}
                    >
                      {tx.channel || "WIRE"}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <RiskBadge level={tx.risk_level} score={tx.risk_score} />
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <ActionBadge action={tx.recommended_action} />
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/transactions/${tx.transaction_id}`);
                      }}
                      className="p-1.5 rounded-lg transition-colors hover:scale-110"
                      style={{ color: "var(--color-ink-3)" }}
                      title="Inspect Transaction Evidence"
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

      {/* Pagination Footer */}
      <div
        className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        style={{
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-bg-soft)",
          color: "var(--color-ink-2)",
        }}
      >
        <div>
          Showing{" "}
          <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>
            {total > 0 ? (page - 1) * pageSize + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>
            {Math.min(page * pageSize, total)}
          </span>{" "}
          of <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>{total}</span> transactions
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Previous
          </Button>

          <span className="px-3 py-1 text-xs font-mono font-medium" style={{ color: "var(--color-ink)" }}>
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
