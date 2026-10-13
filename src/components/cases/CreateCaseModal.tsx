import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Case, CaseType, RiskLevel } from "../../types";
import { caseService } from "../../services/caseService";
import { Briefcase } from "lucide-react";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCase: Case) => void;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("aml_structuring");
  const [severity, setSeverity] = useState<RiskLevel>("high");
  const [analyst, setAnalyst] = useState("Sarah Chen (Lead AML)");
  const [accounts, setAccounts] = useState("ACC-8491, ACC-3042");
  const [transactions, setTransactions] = useState("TX-2026-98104");
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const related_accounts = accounts.split(",").map((s) => s.trim()).filter(Boolean);
      const related_transactions = transactions.split(",").map((s) => s.trim()).filter(Boolean);

      const created = await caseService.createCase({
        title,
        case_type: caseType,
        severity,
        assigned_analyst: analyst,
        related_accounts,
        related_transactions,
        summary,
      });

      onCreated(created);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Investigation Case"
      subtitle="Register an operational case dossier in the AML management queue"
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
            placeholder="e.g. Shell Corp Layering Ring - Apex Trading"
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
              <option value="aml_structuring">AML Structuring</option>
              <option value="mule_account_ring">Mule Account Ring</option>
              <option value="account_takeover">Account Takeover</option>
              <option value="velocity_anomaly">Velocity Anomaly</option>
              <option value="sanctions_match">Sanctions Match</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Severity
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
              Assigned Analyst
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Related Accounts (comma-separated)
            </label>
            <input
              type="text"
              value={accounts}
              onChange={(e) => setAccounts(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
              Related Transactions (comma-separated)
            </label>
            <input
              type="text"
              value={transactions}
              onChange={(e) => setTransactions(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-ink uppercase tracking-wider block mb-1">
            Case Summary & Evidence Overview
          </label>
          <textarea
            rows={3}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Document observed pattern, suspicious indicators, or regulatory escalation trigger..."
            className="w-full p-3 text-xs bg-surface-soft border border-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2.5">
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
