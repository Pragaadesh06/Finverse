import React from "react";
import { NetworkNode } from "../../types";
import { RiskBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatCurrency } from "../../lib/utils";
import { X, Building, ArrowUpRight, ArrowDownLeft, ExternalLink, Briefcase, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccountDetailDrawerProps {
  node: NetworkNode | null;
  onClose: () => void;
}

export const AccountDetailDrawer: React.FC<AccountDetailDrawerProps> = ({ node, onClose }) => {
  const navigate = useNavigate();
  if (!node) return null;

  return (
    <div
      className="absolute top-4 right-4 bottom-4 w-80 sm:w-96 backdrop-blur-md rounded-2xl border shadow-modal z-20 flex flex-col overflow-hidden animate-slide-up"
      style={{
        background: "var(--color-bg-card)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-border flex items-start justify-between bg-surface-subtle">
        <div>
          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">
            Account Dossier
          </span>
          <h3
            className="text-base font-bold text-ink tracking-tight mt-0.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {node.account_holder}
          </h3>
          <div className="font-mono text-xs text-ink-secondary mt-0.5">
            ID: <strong className="text-ink">{node.id}</strong>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-soft transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-5 overflow-y-auto flex-1">
        {/* Risk Level Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-border">
          <span className="text-xs font-semibold text-ink-secondary">Risk Classification:</span>
          <RiskBadge level={node.risk_level} />
        </div>

        {/* Account Details */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-ink-secondary">Entity Type:</span>
            <span className="font-semibold text-ink">{node.account_type}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-ink-secondary">Jurisdiction:</span>
            <span className="font-semibold text-ink">{node.country || "Not Disclosed"}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-ink-secondary">Graph Degree:</span>
            <span className="font-mono font-bold text-ink">
              {node.transaction_count || 1} connected transfers
            </span>
          </div>
        </div>

        {/* Financial Flow Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div
            className="p-3 rounded-xl border"
            style={{
              background: "rgba(46,125,82,0.08)",
              borderColor: "rgba(46,125,82,0.25)",
            }}
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--color-low)" }}>
              <ArrowDownLeft className="w-3.5 h-3.5" /> Total Inflow
            </div>
            <div className="text-sm font-bold font-mono text-ink mt-1">
              {formatCurrency(node.total_inflow || 0, "INR", true)}
            </div>
          </div>

          <div
            className="p-3 rounded-xl border"
            style={{
              background: "rgba(184,134,11,0.08)",
              borderColor: "rgba(184,134,11,0.25)",
            }}
          >
            <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--color-gold)" }}>
              <ArrowUpRight className="w-3.5 h-3.5" /> Total Outflow
            </div>
            <div className="text-sm font-bold font-mono text-ink mt-1">
              {formatCurrency(node.total_outflow || 0, "INR", true)}
            </div>
          </div>
        </div>

        {node.is_flagged && (
          <div
            className="p-3 rounded-xl border text-xs leading-relaxed"
            style={{
              background: "rgba(168,25,15,0.08)",
              borderColor: "rgba(168,25,15,0.25)",
              color: "var(--color-critical)",
            }}
          >
            <strong className="block font-bold mb-0.5">Automated Heuristic Flag:</strong>
            Entity is involved in high-confidence anomalous flow topology and flagged by graph cycle detector.
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-surface-subtle space-y-2">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/transactions?search=${node.id}`)}
          rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
        >
          View Account Transactions
        </Button>
      </div>
    </div>
  );
};
