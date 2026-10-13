import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { transactionService } from "../services/transactionService";
import { Transaction, RiskAssessment, RecommendedAction } from "../types";
import { formatCurrency, formatDateTime, formatRelativeTime } from "../lib/utils";
import { RiskBadge, ActionBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { RiskExplanationPanel } from "../components/transactions/RiskExplanationPanel";
import { ActionDecisionModal } from "../components/transactions/ActionDecisionModal";
import { CreateCaseFromTxModal } from "../components/transactions/CreateCaseFromTxModal";
import {
  ArrowLeft,
  Share2,
  Briefcase,
  ShieldCheck,
  Clock,
  User,
  Building,
  Globe,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export const TransactionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [tx, assess] = await Promise.all([
        transactionService.getTransactionById(id),
        transactionService.getRiskAssessment(id),
      ]);
      setTransaction(tx);
      setAssessment(assess);
    } catch (err: any) {
      setError(err?.message || "Failed to load transaction investigation dossier.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleRecordDecision = async (
    action: RecommendedAction,
    decisionType: "approve" | "escalate" | "block",
    notes: string
  ) => {
    if (!transaction) return;
    const updated = await transactionService.recordDecision({
      transactionId: transaction.transaction_id,
      action,
      decisionType,
      notes,
    });
    setTransaction(updated);
    setSuccessToast(`Decision recorded: ${decisionType.toUpperCase()} applied successfully.`);
    setTimeout(() => setSuccessToast(null), 4000);
    // Refresh assessment timeline
    const freshAssess = await transactionService.getRiskAssessment(transaction.transaction_id);
    setAssessment(freshAssess);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-4" style={{ color: "var(--color-ink-2)" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: "var(--color-accent-2)", borderTopColor: "transparent" }}
        />
        <p className="text-sm font-medium">Loading transaction investigation dossier…</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div
        className="rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>
          Transaction Record Unavailable
        </h3>
        <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
          {error || "The specified transaction could not be located."}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/transactions")}>
          Return to Transaction Monitor
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back and Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate("/transactions")}
          className="inline-flex items-center gap-2 text-xs font-semibold transition-colors group"
          style={{ color: "var(--color-ink-2)" }}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Transactions</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/network?account=${transaction.sender_account_id}`)}
            leftIcon={<Share2 className="w-3.5 h-3.5" style={{ color: "var(--color-gold)" }} />}
          >
            Explore in AML Network
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCaseModalOpen(true)}
            leftIcon={<Briefcase className="w-3.5 h-3.5" style={{ color: "var(--color-accent-2)" }} />}
          >
            Open Investigation Case
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDecisionModalOpen(true)}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            Record Decision
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          className="p-4 rounded-xl text-xs flex items-center gap-2 animate-slide-up"
          style={{
            background: "var(--color-accent-muted)",
            border: "1px solid rgba(46,125,82,0.25)",
            color: "var(--color-accent)",
          }}
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Summary Card */}
      <div
        className="rounded-2xl p-6 space-y-6 transition-all"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
        }}
      >
        <div
          className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase" style={{ color: "var(--color-ink-3)" }}>
                Transaction ID
              </span>
              <span className="text-xl font-bold font-mono tracking-tight" style={{ color: "var(--color-ink)" }}>
                {transaction.transaction_id}
              </span>
              <span
                className="text-xs uppercase font-mono px-2 py-0.5 rounded"
                style={{
                  background: "var(--color-bg-soft)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink-2)",
                }}
              >
                {transaction.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs mt-1.5" style={{ color: "var(--color-ink-2)" }}>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-ink-3)" }} />
                {formatDateTime(transaction.timestamp)} ({formatRelativeTime(transaction.timestamp)})
              </span>
              <span>•</span>
              <span className="font-mono">{transaction.channel || "WIRE"} Network</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-[11px] font-medium" style={{ color: "var(--color-ink-3)" }}>
                Transaction Amount
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-0.5" style={{ color: "var(--color-ink)" }}>
                {formatCurrency(transaction.amount, transaction.currency)}
              </div>
            </div>
            <div
              className="pl-4 flex flex-col items-center"
              style={{ borderLeft: "1px solid var(--color-border)" }}
            >
              <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
              <div className="mt-1">
                <ActionBadge action={transaction.recommended_action} />
              </div>
            </div>
          </div>
        </div>

        {/* Counterparty Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Originator / Sender Card */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{
              background: "var(--color-bg-soft)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5" style={{ color: "var(--color-ink-2)" }}>
                <User className="w-3.5 h-3.5" style={{ color: "var(--color-accent-2)" }} /> Originator (Sender)
              </span>
              <button
                onClick={() => navigate(`/network?account=${transaction.sender_account_id}`)}
                className="text-[11px] font-semibold hover:underline flex items-center gap-0.5"
                style={{ color: "var(--color-accent-2)" }}
              >
                Graph View <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                {transaction.sender_name || "Account Holder Not Named"}
              </h4>
              <div className="font-mono text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
                Account ID: <strong style={{ color: "var(--color-ink)" }}>{transaction.sender_account_id}</strong>
              </div>
            </div>

            <div
              className="pt-2 grid grid-cols-2 gap-2 text-[11px]"
              style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-ink-2)" }}
            >
              <div>
                <span className="block" style={{ color: "var(--color-ink-3)" }}>
                  IP Geolocation:
                </span>
                <span className="font-mono font-medium flex items-center gap-1" style={{ color: "var(--color-ink)" }}>
                  <Globe className="w-3 h-3" style={{ color: "var(--color-ink-3)" }} />
                  {transaction.ip_country || "India (IN)"}
                </span>
              </div>
              <div>
                <span className="block" style={{ color: "var(--color-ink-3)" }}>
                  Device Hash:
                </span>
                <span className="font-mono font-medium truncate block max-w-[130px]" style={{ color: "var(--color-ink)" }}>
                  {transaction.device_fingerprint || "fp_default"}
                </span>
              </div>
            </div>
          </div>

          {/* Beneficiary / Receiver Card */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{
              background: "var(--color-bg-soft)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5" style={{ color: "var(--color-ink-2)" }}>
                <Building className="w-3.5 h-3.5" style={{ color: "var(--color-accent-2)" }} /> Beneficiary (Receiver)
              </span>
              <button
                onClick={() => navigate(`/network?account=${transaction.receiver_account_id}`)}
                className="text-[11px] font-semibold hover:underline flex items-center gap-0.5"
                style={{ color: "var(--color-accent-2)" }}
              >
                Graph View <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                {transaction.receiver_name || "Counterparty Unverified"}
              </h4>
              <div className="font-mono text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
                Account ID: <strong style={{ color: "var(--color-ink)" }}>{transaction.receiver_account_id}</strong>
              </div>
            </div>

            <div
              className="pt-2 grid grid-cols-2 gap-2 text-[11px]"
              style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-ink-2)" }}
            >
              <div>
                <span className="block" style={{ color: "var(--color-ink-3)" }}>
                  Merchant Category:
                </span>
                <span className="font-medium" style={{ color: "var(--color-ink)" }}>
                  {transaction.merchant_category || "General Commercial Flow"}
                </span>
              </div>
              <div>
                <span className="block" style={{ color: "var(--color-ink-3)" }}>
                  Settlement Route:
                </span>
                <span className="font-medium" style={{ color: "var(--color-ink)" }}>
                  Direct Clearing Node
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explainable AI Risk Assessment: "Why was this flagged?" */}
      {assessment && <RiskExplanationPanel assessment={assessment} />}

      {/* Chronological Investigation Timeline */}
      {assessment?.timeline && assessment.timeline.length > 0 && (
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
          }}
        >
          <h3
            className="text-base font-bold tracking-tight font-sans"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--color-ink)",
            }}
          >
            Chronological Audit & Forensic Timeline
          </h3>
          <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
            Sequential event stream reconstructed by the Finverse orchestration pipeline
          </p>

          <div
            className="relative pl-6 space-y-6"
            style={{
              borderLeft: "2px solid var(--color-border)",
              marginLeft: "0.5rem",
            }}
          >
            {assessment.timeline.map((event) => (
              <div key={event.id} className="relative group">
                <div
                  className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "var(--color-accent-2)",
                    border: "2px solid var(--color-bg-card)",
                    boxShadow: "0 0 0 2px var(--color-border)",
                  }}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                    {event.title}
                  </h4>
                  <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-3)" }}>
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>
                  {event.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Decision Modal */}
      <ActionDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        transaction={transaction}
        onConfirm={handleRecordDecision}
      />

      {/* Create Case Modal */}
      <CreateCaseFromTxModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        transaction={transaction}
      />
    </div>
  );
};

export default TransactionDetailsPage;
