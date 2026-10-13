import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
} from "lucide-react";
import { customerService, CustomerTransactionItem } from "../../services/customerService";
import { formatCurrency, formatDateTime } from "../../lib/utils";

export const CustomerTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<CustomerTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<CustomerTransactionItem | null>(null);

  const fetchTransactions = async (pg = page, term = search, stat = statusFilter) => {
    setIsLoading(true);
    try {
      const res = await customerService.getTransactions({
        page: pg,
        page_size: 15,
        search: term || undefined,
        status: stat !== "all" ? stat : undefined,
      });
      setTransactions(res.items);
      setTotal(res.total);
      setPages(res.pages);
      setPage(res.page);
    } catch (err) {
      console.error("Failed to load customer transactions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1, search, statusFilter);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1, search, statusFilter);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-[#738875]/15 text-[#2E7D52] dark:text-[#8EBE95] border-[#738875]/30";
      case "Standard Safety Review":
        return "bg-[#B49A63]/15 text-[#8A7034] dark:text-[#E2C582] border-[#B49A63]/30";
      case "In Verification":
        return "bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#93C5FD] border-[#3B82F6]/30";
      case "Declined":
        return "bg-[#873C43]/15 text-[#873C43] dark:text-[#F87171] border-[#873C43]/30";
      default:
        return "bg-[#DCD8CE]/40 text-[#5A6356] border-[#DCD8CE]";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DCD8CE] dark:border-[#24483C] pb-6">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#B49A63] bg-[#B49A63]/15 px-2.5 py-0.5 rounded-full">
            Financial Records
          </span>
          <h1 className="font-serif text-3xl font-semibold text-[#102A23] dark:text-[#F7F4EC] mt-2">
            My Transactions
          </h1>
          <p className="text-sm text-[#5A6356] dark:text-[#DCD8CE] mt-1 font-sans">
            Review authorized payments, debits, credits, and formal settlement statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={customerService.getExportDownloadUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] bg-white dark:bg-[#193C32] text-xs font-medium text-[#242923] dark:text-[#F7F4EC] hover:bg-[#EEE8DA]/50 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-[#B49A63]" />
            Download CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-[#193C32] p-4 rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#5A6356] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search counterparty or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none focus:ring-1 focus:ring-[#B49A63]"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#5A6356]" />
          <span className="text-xs text-[#5A6356]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl bg-[#F7F4EC]/60 dark:bg-[#102A23]/60 border border-[#DCD8CE] dark:border-[#24483C] text-[#242923] dark:text-[#F7F4EC] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Standard Safety Review">Standard Safety Review</option>
            <option value="In Verification">In Verification</option>
            <option value="Declined">Declined</option>
          </select>

          <button
            onClick={() => fetchTransactions(1, search, statusFilter)}
            className="p-2 rounded-xl border border-[#DCD8CE] dark:border-[#24483C] text-[#5A6356] hover:text-[#242923] transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#5A6356]">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#B49A63]" />
            Loading transaction records...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-sm text-[#5A6356] dark:text-[#DCD8CE]">
            No transactions found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#DCD8CE] dark:border-[#24483C] bg-[#F7F4EC]/40 dark:bg-[#102A23]/30 text-[#5A6356] dark:text-[#DCD8CE] font-medium">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Counterparty</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Safety Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCD8CE]/60 dark:divide-[#24483C]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.transaction_id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-[#F7F4EC]/50 dark:hover:bg-[#102A23]/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 text-[#5A6356] dark:text-[#DCD8CE] font-mono">
                      {tx.timestamp ? formatDateTime(tx.timestamp) : "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-[#242923] dark:text-[#F7F4EC]">
                      {tx.transaction_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#242923] dark:text-[#F7F4EC]">
                        {tx.counterparty}
                      </div>
                      <div className="text-[10px] text-[#5A6356] dark:text-[#DCD8CE] font-mono">
                        {tx.counterparty_account}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5A6356] dark:text-[#DCD8CE]">
                      {tx.channel}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      <span
                        className={
                          tx.direction === "inflow"
                            ? "text-[#2E7D52] dark:text-[#8EBE95]"
                            : "text-[#242923] dark:text-[#F7F4EC]"
                        }
                      >
                        {tx.direction === "inflow" ? "+" : "-"}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/customer/disputes?tx=${tx.transaction_id}`)}
                        className="p-1.5 rounded-lg text-[#873C43] hover:bg-[#873C43]/10 transition"
                        title="Report suspicious charge"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pages > 1 && (
          <div className="p-4 border-t border-[#DCD8CE] dark:border-[#24483C] flex items-center justify-between text-xs text-[#5A6356]">
            <div>
              Showing page {page} of {pages} ({total} transactions)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchTransactions(page - 1, search, statusFilter)}
                className="p-1.5 rounded-lg border border-[#DCD8CE] dark:border-[#24483C] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= pages}
                onClick={() => fetchTransactions(page + 1, search, statusFilter)}
                className="p-1.5 rounded-lg border border-[#DCD8CE] dark:border-[#24483C] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white dark:bg-[#193C32] rounded-2xl border border-[#DCD8CE] dark:border-[#24483C] p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#DCD8CE] dark:border-[#24483C] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#B49A63]">
                  Transfer Voucher
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#102A23] dark:text-[#F7F4EC]">
                  {selectedTx.transaction_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-[#5A6356] hover:bg-[#EEE8DA] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Amount</span>
                <span className="font-mono font-semibold text-[#242923] dark:text-[#F7F4EC] text-sm">
                  {formatCurrency(selectedTx.amount, selectedTx.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Direction</span>
                <span className="capitalize text-[#242923] dark:text-[#F7F4EC]">
                  {selectedTx.direction === "inflow" ? "Deposit / Credit" : "Payment / Debit"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Counterparty Entity</span>
                <span className="font-medium text-[#242923] dark:text-[#F7F4EC]">
                  {selectedTx.counterparty}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Counterparty Account</span>
                <span className="font-mono text-[#242923] dark:text-[#F7F4EC]">
                  {selectedTx.counterparty_account}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Payment Rail</span>
                <span className="text-[#242923] dark:text-[#F7F4EC]">{selectedTx.channel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DCD8CE]/40">
                <span className="text-[#5A6356]">Timestamp</span>
                <span className="text-[#242923] dark:text-[#F7F4EC]">
                  {selectedTx.timestamp ? formatDateTime(selectedTx.timestamp) : "—"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#5A6356]">Verification Status</span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(
                    selectedTx.status
                  )}`}
                >
                  {selectedTx.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const txId = selectedTx.transaction_id;
                  setSelectedTx(null);
                  navigate(`/customer/disputes?tx=${txId}`);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#873C43] hover:bg-[#6e2d33] text-white text-xs font-medium transition flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Report Suspicious Charge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTransactionsPage;
