import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { NetworkEdge } from "../../types";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { RiskBadge } from "../ui/Badge";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TransferDetailModalProps {
  edge: NetworkEdge | null;
  onClose: () => void;
}

export const TransferDetailModal: React.FC<TransferDetailModalProps> = ({ edge, onClose }) => {
  const navigate = useNavigate();
  if (!edge) return null;

  return (
    <Modal
      isOpen={Boolean(edge)}
      onClose={onClose}
      title="Graph Transfer Edge Details"
      subtitle={`Directed money transfer flow between counterparties`}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Flow Representation */}
        <div className="p-4 rounded-xl bg-surface-soft border border-border flex items-center justify-between gap-3 text-center">
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-ink-muted block">Source</span>
            <span className="font-mono font-bold text-xs text-ink block mt-0.5">
              {edge.source}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span
              className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border shadow-subtle"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
                color: "var(--color-forest)",
              }}
            >
              {formatCurrency(edge.amount, edge.currency || "INR")}
            </span>
            <ArrowRight className="w-4 h-4 mt-1" style={{ color: "var(--color-forest)" }} />
          </div>

          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-ink-muted block">Target</span>
            <span className="font-mono font-bold text-xs text-ink block mt-0.5">
              {edge.target}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-ink-secondary">Transaction ID:</span>
            <span className="font-mono font-bold text-ink">{edge.transaction_id}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-ink-secondary">Transfer Timestamp:</span>
            <span className="font-mono text-ink">{formatDateTime(edge.timestamp)}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/60">
            <span className="text-ink-secondary">Risk Attribution:</span>
            <RiskBadge level={edge.risk_level || "high"} />
          </div>
          {edge.is_suspicious_path && (
            <div
              className="p-2.5 rounded-lg text-[11px] font-medium border mt-2"
              style={{
                background: "rgba(168,25,15,0.08)",
                borderColor: "rgba(168,25,15,0.25)",
                color: "var(--color-critical)",
              }}
            >
              🚨 Flagged as part of a high-confidence circular layering ring.
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/transactions/${edge.transaction_id}`);
            }}
            rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Investigate Transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
};
