import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Transaction, RecommendedAction } from "../../types";
import { CheckCircle2, AlertOctagon, ArrowUpRight, ShieldCheck, ShieldAlert } from "lucide-react";

interface ActionDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  onConfirm: (
    action: RecommendedAction,
    decisionType: "approve" | "escalate" | "block",
    notes: string
  ) => Promise<void>;
}

export const ActionDecisionModal: React.FC<ActionDecisionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) => {
  const [decisionType, setDecisionType] = useState<"approve" | "escalate" | "block">("escalate");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let action: RecommendedAction = "manual_review";
      if (decisionType === "approve") action = "allow";
      else if (decisionType === "block") action = "hold_for_review";

      await onConfirm(action, decisionType, notes);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Analyst Orchestration Decision"
      subtitle={`Apply formal resolution for transaction ${transaction.transaction_id}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-ink uppercase tracking-wider">
            Select Decision Directive
          </label>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Allow */}
            <button
              type="button"
              onClick={() => setDecisionType("approve")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                decisionType === "approve"
                  ? "border-[var(--color-low)] bg-[rgba(46,125,82,0.12)] ring-2 ring-[rgba(46,125,82,0.2)] text-[var(--color-low)]"
                  : "border-border hover:bg-surface-soft text-ink-secondary"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-2" style={{ color: "var(--color-low)" }} />
              <div>
                <div className="text-xs font-bold text-ink">Allow & Clear</div>
                <div className="text-[10px] text-ink-muted mt-0.5">False Positive</div>
              </div>
            </button>

            {/* Escalate */}
            <button
              type="button"
              onClick={() => setDecisionType("escalate")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                decisionType === "escalate"
                  ? "border-[var(--color-forest)] bg-[rgba(30,77,53,0.12)] ring-2 ring-[rgba(30,77,53,0.2)] text-[var(--color-forest)]"
                  : "border-border hover:bg-surface-soft text-ink-secondary"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 mb-2" style={{ color: "var(--color-forest)" }} />
              <div>
                <div className="text-xs font-bold text-ink">Escalate Review</div>
                <div className="text-[10px] text-ink-muted mt-0.5">Tier 2 Analyst</div>
              </div>
            </button>

            {/* Block / Hold */}
            <button
              type="button"
              onClick={() => setDecisionType("block")}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                decisionType === "block"
                  ? "border-[var(--color-critical)] bg-[rgba(168,25,15,0.12)] ring-2 ring-[rgba(168,25,15,0.2)] text-[var(--color-critical)]"
                  : "border-border hover:bg-surface-soft text-ink-secondary"
              }`}
            >
              <AlertOctagon className="w-4 h-4 mb-2" style={{ color: "var(--color-critical)" }} />
              <div>
                <div className="text-xs font-bold text-ink">Hold for AML</div>
                <div className="text-[10px] text-ink-muted mt-0.5">SAR Filing Req</div>
              </div>
            </button>
          </div>
        </div>

        {/* Audit Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
            <span>Investigation Audit Note</span>
            <span className="text-[11px] text-ink-muted lowercase font-normal">(Required for compliance log)</span>
          </label>
          <textarea
            required
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document rationale, phone verification outcome, or invoice validation details..."
            className="w-full p-3 text-xs bg-surface-soft border border-border rounded-xl text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-royal/20 focus:border-brand-royal"
          />
        </div>

        {/* Notice */}
        <div className="p-3 bg-surface-subtle border border-border rounded-xl text-[11px] text-ink-secondary flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-brand-royal mt-0.5 flex-shrink-0" />
          <span>
            Consequential actions are cryptographically logged to the audit trail and synchronized
            with the active investigation ledger.
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            variant={decisionType === "block" ? "danger" : "primary"}
          >
            Confirm Decision
          </Button>
        </div>
      </form>
    </Modal>
  );
};
