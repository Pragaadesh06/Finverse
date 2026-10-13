import React, { useState } from "react";
import { Case, CaseStatus, RiskLevel } from "../../types";
import { caseService } from "../../services/caseService";
import { formatDateTime, formatRelativeTime } from "../../lib/utils";
import { RiskBadge, CaseStatusBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  X,
  Briefcase,
  User,
  Clock,
  Send,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CaseDetailDrawerProps {
  caseItem: Case | null;
  onClose: () => void;
  onUpdate: (updatedCase: Case) => void;
}

export const CaseDetailDrawer: React.FC<CaseDetailDrawerProps> = ({
  caseItem,
  onClose,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [status, setStatus] = useState<CaseStatus>(caseItem?.status || "open");
  const [analyst, setAnalyst] = useState(caseItem?.assigned_analyst || "");

  if (!caseItem) return null;

  const handleStatusChange = async (newStatus: CaseStatus) => {
    setStatus(newStatus);
    const updated = await caseService.updateCase(caseItem.id, { status: newStatus });
    onUpdate(updated);
  };

  const handleAnalystChange = async (newAnalyst: string) => {
    setAnalyst(newAnalyst);
    const updated = await caseService.updateCase(caseItem.id, { assigned_analyst: newAnalyst });
    onUpdate(updated);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      const updated = await caseService.addNote(caseItem.id, newNote.trim(), "Sarah Chen");
      setNewNote("");
      onUpdate(updated);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ background: "rgba(30,77,53,0.35)" }}
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          className="w-screen max-w-xl border-l shadow-modal flex flex-col"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border)",
          }}
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-start justify-between bg-surface-subtle">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-secondary">
                  {caseItem.case_id}
                </span>
                <RiskBadge level={caseItem.severity} />
                <CaseStatusBadge status={caseItem.status} />
              </div>
              <h2
                className="text-base font-bold text-ink tracking-tight mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {caseItem.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-soft transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Status & Reassignment Toolbar */}
            <div className="p-4 rounded-xl bg-surface-soft border border-border grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-ink-secondary uppercase block mb-1">
                  Lifecycle Status:
                </label>
                <select
                  value={caseItem.status}
                  onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                  className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_review">In Review</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-secondary uppercase block mb-1">
                  Assigned Officer:
                </label>
                <select
                  value={caseItem.assigned_analyst}
                  onChange={(e) => handleAnalystChange(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none"
                >
                  <option value="Sarah Chen (Lead AML)">Sarah Chen (Lead AML)</option>
                  <option value="Marcus Brody (Fraud Specialist)">Marcus Brody (Fraud Specialist)</option>
                  <option value="Elena Torres (Compliance)">Elena Torres (Compliance)</option>
                </select>
              </div>
            </div>

            {/* Case Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Case Narrative & Typology Summary
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed bg-surface-subtle p-3.5 rounded-xl border border-border">
                {caseItem.summary}
              </p>
              {caseItem.trigger_reason && (
                <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl text-xs text-red-800">
                  <strong className="block font-bold mb-0.5">Automated Engine Trigger:</strong>
                  {caseItem.trigger_reason}
                </div>
              )}
            </div>

            {/* Related Entities & Transactions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Linked Accounts & Evidentiary Transactions
              </h3>

              <div className="space-y-2">
                <div className="text-[11px] text-ink-secondary font-medium">Counterparty Accounts:</div>
                <div className="flex flex-wrap gap-2">
                  {caseItem.related_accounts.map((acc) => (
                    <button
                      key={acc}
                      onClick={() => {
                        onClose();
                        navigate(`/network?account=${acc}`);
                      }}
                      className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-soft border border-border hover:border-brand-royal hover:text-brand-royal transition-colors flex items-center gap-1.5"
                    >
                      <span>{acc}</span>
                      <ExternalLink className="w-3 h-3 text-ink-muted" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-[11px] text-ink-secondary font-medium">Flagged Transactions:</div>
                <div className="flex flex-wrap gap-2">
                  {caseItem.related_transactions.map((tx) => (
                    <button
                      key={tx}
                      onClick={() => {
                        onClose();
                        navigate(`/transactions/${tx}`);
                      }}
                      className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5"
                      style={{
                        background: "rgba(30,77,53,0.08)",
                        borderColor: "rgba(30,77,53,0.25)",
                        color: "var(--color-forest)",
                      }}
                    >
                      <span>{tx}</span>
                      <ExternalLink className="w-3 h-3" style={{ color: "var(--color-forest)" }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Investigation Notes & Log */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                  Investigator Notes & Audit Log ({caseItem.notes.length})
                </h3>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record an investigation update, subpoena notice, or interview note..."
                  className="w-full p-3 text-xs bg-surface-soft border border-border rounded-xl text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-royal/20"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="xs"
                    isLoading={isSubmittingNote}
                    disabled={!newNote.trim()}
                    leftIcon={<Send className="w-3 h-3" />}
                  >
                    Post Note
                  </Button>
                </div>
              </form>

              {/* Note Stream */}
              <div className="space-y-2.5 pt-2">
                {caseItem.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-surface-subtle border border-border rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-ink flex items-center gap-1">
                        <User className="w-3 h-3 text-brand-royal" /> {note.author}
                      </span>
                      <span className="font-mono text-ink-muted">
                        {formatRelativeTime(note.timestamp)}
                      </span>
                    </div>
                    <p className="text-ink-secondary leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
