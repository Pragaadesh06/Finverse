import React from "react";
import { SearchBar } from "../ui/SearchBar";
import { Button } from "../ui/Button";
import { RotateCcw } from "lucide-react";

export interface TransactionFilterState {
  search: string;
  risk_level: string;
  recommended_action: string;
  status: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilterState;
  onChange: (filters: TransactionFilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onChange,
  onReset,
  totalResults,
}) => {
  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.risk_level !== "all" ||
    filters.recommended_action !== "all" ||
    filters.status !== "all";

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl space-y-4 transition-all"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
      }}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <SearchBar
            value={filters.search}
            onChangeValue={(val) => onChange({ ...filters, search: val })}
            placeholder="Search by Tx ID, Account ID (e.g. ACC-8491), or entity…"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-ink-2)" }}>
              Risk:
            </span>
            <select
              value={filters.risk_level}
              onChange={(e) => onChange({ ...filters, risk_level: e.target.value })}
              className="text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none cursor-pointer"
              style={{
                background: "var(--color-bg-soft)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical (85-100)</option>
              <option value="high">High (65-84)</option>
              <option value="medium">Medium (35-64)</option>
              <option value="low">Low (0-34)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-ink-2)" }}>
              Action:
            </span>
            <select
              value={filters.recommended_action}
              onChange={(e) => onChange({ ...filters, recommended_action: e.target.value })}
              className="text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none cursor-pointer"
              style={{
                background: "var(--color-bg-soft)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
            >
              <option value="all">All Actions</option>
              <option value="allow">Allow</option>
              <option value="step_up_verification">Step-Up 2FA</option>
              <option value="manual_review">Manual Review</option>
              <option value="hold_for_review">Hold for AML</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: "var(--color-ink-2)" }}>
              Status:
            </span>
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none cursor-pointer"
              style={{
                background: "var(--color-bg-soft)",
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="settled">Settled</option>
              <option value="flagged">Flagged</option>
              <option value="held">Held</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="blocked">Blocked</option>
              <option value="cleared">Cleared</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-between text-xs pt-2"
        style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-ink-2)" }}
      >
        <div className="flex items-center gap-2">
          <span>
            Found <strong className="font-mono" style={{ color: "var(--color-ink)" }}>{totalResults}</strong> transactions matching query
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
          Click any row to inspect explainable risk assessment
        </span>
      </div>
    </div>
  );
};

export default TransactionFilters;
