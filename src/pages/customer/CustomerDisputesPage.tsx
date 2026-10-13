import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  Lock,
  X,
} from "lucide-react";
import {
  customerService,
  CustomerDisputeItem,
  CustomerTransactionItem,
} from "../../services/customerService";
import { formatDateTime } from "../../lib/utils";

export const CustomerDisputesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const prefilledTx = searchParams.get("tx") || "";

  const [disputes, setDisputes] = useState<CustomerDisputeItem[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(Boolean(prefilledTx));

  const [selectedTxId, setSelectedTxId] = useState(prefilledTx);
  const [reason, setReason] = useState("unauthorized_charge");
  const [description, setDescription] = useState("");
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dispRes, txRes] = await Promise.all([
        customerService.getDisputes(),
        customerService.getTransactions({ page_size: 50 }),
      ]);
      setDisputes(dispRes.disputes);
      setTransactions(txRes.items);
    } catch (err) {
      console.error("Failed to load dispute records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxId) return;

    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      const res = await customerService.submitDispute({
        transaction_id: selectedTxId,
        reason,
        description: description || undefined,
      });
      setSubmitFeedback(res.message);
      setSelectedTxId("");
      setDescription("");
      setTimeout(() => {
        setShowModal(false);
        setSubmitFeedback(null);
      }, 2000);
      loadData();
    } catch (err: any) {
      setSubmitFeedback(err?.message || "Failed to submit suspicious transaction report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "submitted":
        return "bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582] border-[#B49A63]/30";
      case "under_review":
      case "investigating":
        return "bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#93C5FD] border-[#3B82F6]/30";
      case "resolved":
        return "bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95] border-[#738875]/30";
      default:
        return "bg-[#DCD8CE]/40 text-[#5A6356] border-[#DCD8CE]";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#873C43] bg-[#873C43]/15 px-2.5 py-0.5 rounded-full">
            Payment Security & Disputes
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#102A23] dark:text-[#F7F4EC] mt-2">
            My Reports & Disputes
          </h1>
          <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
            Track investigations for flagged payments, unrecognized charges, and fraud reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#873C43] hover:bg-[#6e2d33] text-white text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Report Suspicious Activity
          </button>
        </div>
      </div>

      {/* Disputes Ledger */}
      <div className="bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#5A6356]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#B49A63]" />
            Retrieving safety reports...
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#738875]/15 text-[#2E7D52] flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
              No Active Inquiries
            </h3>
            <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] max-w-sm mx-auto">
              Your account has zero pending dispute investigations. All historical clearing records appear normal.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-xs font-semibold text-[#873C43] hover:underline inline-block"
            >
              Report a transaction now →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DCD8CE]/60 dark:divide-[#24483C]">
            {disputes.map((disp) => (
              <div key={disp.reference_no} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold text-[#242923] dark:text-[#F7F4EC]">
                        {disp.reference_no}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(disp.status)}`}>
                        {disp.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-[#5A6356] dark:text-[#DCD8CE] mt-1 flex items-center gap-2">
                      <span>Linked Transaction: <strong className="font-mono text-[#242923] dark:text-[#F7F4EC]">{disp.transaction_id}</strong></span>
                      <span>•</span>
                      <span>Reason: {disp.reason.replace("_", " ")}</span>
                      <span>•</span>
                      <span>Submitted: {disp.created_at ? formatDateTime(disp.created_at) : "Recently"}</span>
                    </div>
                  </div>
                </div>

                {disp.description && (
                  <p className="text-xs text-[#5A6356] dark:text-[#DCD8CE] bg-[#F7F4EC]/60 dark:bg-[#102A23]/50 p-3 rounded-xl border border-[#DCD8CE]/40">
                    "{disp.description}"
                  </p>
                )}

                {/* Progress Timeline */}
                {disp.updates && disp.updates.length > 0 && (
                  <div className="border-t border-[#DCD8CE]/40 pt-3">
                    <span className="text-[10px] font-semibold text-[#5A6356] uppercase tracking-wider block mb-2">
                      Investigation Progress
                    </span>
                    <div className="space-y-2">
                      {disp.updates.map((upd, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#B49A63] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-[#242923] dark:text-[#F7F4EC]">
                              {upd.status}:
                            </span>{" "}
                            <span className="text-[#5A6356] dark:text-[#DCD8CE]">{upd.message}</span>
                            <span className="text-[10px] text-[#5A6356]/70 ml-2 font-mono">
                              {upd.timestamp ? formatDateTime(upd.timestamp) : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Dispute Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#873C43]">
                  Security Protocol
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
                  Report Suspicious Transaction
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#5A6356] hover:bg-[#EEE8DA] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
                  Select Transaction
                </label>
                <select
                  required
                  value={selectedTxId}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
                >
                  <option value="">— Select an authorized charge —</option>
                  {transactions.map((t) => (
                    <option key={t.transaction_id} value={t.transaction_id}>
                      {t.transaction_id} — {t.counterparty} ({t.currency} {t.amount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
                  Reason for Inquiry
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
                >
                  <option value="unauthorized_charge">Unauthorized Charge / Fraudulent Debit</option>
                  <option value="unrecognized_merchant">Unrecognized Counterparty Entity</option>
                  <option value="incorrect_amount">Incorrect Amount Cleared</option>
                  <option value="duplicate_charge">Duplicate Payment Triggered</option>
                  <option value="card_compromised">Payment Rail / Card Compromised</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5A6356] dark:text-[#DCD8CE] mb-1">
                  Description / Specifics (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide any details regarding why this transfer seems unfamiliar or incorrect..."
                  className="w-full p-2.5 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
                />
              </div>

              {submitFeedback && (
                <div className="p-3 rounded-xl bg-[#738875]/15 border border-[#738875]/30 text-xs text-[#2E7D52] dark:text-[#8EBE95]">
                  {submitFeedback}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] text-xs font-medium text-[#5A6356]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-[#873C43] hover:bg-[#6e2d33] text-white text-xs font-medium transition shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDisputesPage;
