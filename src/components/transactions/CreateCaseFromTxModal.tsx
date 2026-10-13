import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Transaction, CaseType, RiskLevel } from "../../types";
import { caseService } from "../../services/caseService";
import { formatCurrency } from "../../lib/utils";
import { Briefcase, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateCaseFromTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export const CreateCaseFromTxModal: React.FC<CreateCaseFromTxModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(`Investigation into ${transaction.transaction_id} (${transaction.sender_name || transaction.sender_account_id})`);
  const [caseType, setCaseType] = useState<CaseType>("aml_structuring");
  const [severity, setSeverity] = useState<RiskLevel>(transaction.risk_level || "high");
  const [analyst, setAnalyst] = useState("Sarah Chen (Lead AML)");
  const [summary, setSummary] = useState(
    `Flagged transaction ${transaction.transaction_id} of ${formatCurrency(transaction.amount, transaction.currency || "INR")} with risk score ${transaction.risk_score || "N/A"}. Sender: ${transaction.sender_account_id}, Receiver: ${transaction.receiver_account_id}.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newCase = await caseService.createCase({
        title,
        case_type: caseType,
        severity,
        assigned_analyst: analyst,
        related_accounts: [transaction.sender_account_id, transaction.receiver_account_id],
        related_transactions: [transaction.transaction_id],
        summary,
      });

      onClose();
      navigate(`/cases?id=${newCase.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Formal Investigation Case"
      subtitle={`Link transaction ${transaction.transaction_id} to case dossier`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
            Case Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Case Typology
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full px-3 py-2 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
            >
              <option value="aml_structuring">AML Structuring / Smurfing</option>
              <option value="mule_account_ring">Mule Account Ring</option>
              <option value="account_takeover">Account Takeover (ATO)</option>
              <option value="velocity_anomaly">Velocity / Burst Anomaly</option>
              <option value="sanctions_match">Sanctions / Watchlist Hit</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Severity Level
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as RiskLevel)}
              className="w-full px-3 py-2 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Lead Assigned Analyst
            </label>
            <select
              value={analyst}
              onChange={(e) => setAnalyst(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
            >
              <option value="Sarah Chen (Lead AML)">Sarah Chen (Lead AML)</option>
              <option value="Marcus Brody (Fraud Specialist)">Marcus Brody (Fraud Specialist)</option>
              <option value="Elena Torres (Compliance)">Elena Torres (Compliance)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
            Executive Case Summary
          </label>
          <textarea
            rows={3}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full p-3 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
          />
        </div>

        <div className="p-3 bg-surface-subtle border border-border rounded-xl text-xs flex items-center justify-between text-ink-secondary">
          <span>Linked Entities:</span>
          <span className="font-mono font-semibold text-brand-navy">
            {transaction.sender_account_id} • {transaction.receiver_account_id} • {transaction.transaction_id}
          </span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Briefcase className="w-3.5 h-3.5" />}
          >
            Create Investigation Case
          </Button>
        </div>
      </form>
    </Modal>
  );
};
