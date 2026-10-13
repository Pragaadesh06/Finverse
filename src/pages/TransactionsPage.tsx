import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { transactionService } from "../services/transactionService";
import { realtimeStream } from "../services/websocketService";
import { Transaction } from "../types";
import { TransactionFilters, TransactionFilterState } from "../components/transactions/TransactionFilters";
import { TransactionTable } from "../components/transactions/TransactionTable";
import { AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";

export const TransactionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<TransactionFilterState>({
    search: searchParams.get("search") || "",
    risk_level: searchParams.get("risk_level") || "all",
    recommended_action: searchParams.get("recommended_action") || "all",
    status: searchParams.get("status") || "all",
  });

  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<"timestamp" | "amount" | "risk_score">("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await transactionService.getTransactions({
        search: filters.search,
        risk_level: filters.risk_level,
        recommended_action: filters.recommended_action,
        status: filters.status,
        limit: 100, // get pool for client sorting & pagination
        offset: 0,
      });

      let items = [...res.items];

      // Apply sorting
      items.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "timestamp") {
          valA = new Date(a.timestamp).getTime();
          valB = new Date(b.timestamp).getTime();
        } else if (sortField === "risk_score") {
          valA = a.risk_score ?? -1;
          valB = b.risk_score ?? -1;
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      setTotal(items.length);

      // Paginate
      const start = (page - 1) * pageSize;
      setTransactions(items.slice(start, start + pageSize));
    } catch (err: any) {
      setError(err?.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters, page, sortField, sortDirection]);

  // Sync with live streaming if on page 1 and no search filter
  useEffect(() => {
    const unsub = realtimeStream.onTransaction((newTx: Transaction) => {
      if (page === 1 && !filters.search && filters.risk_level === "all") {
        setTransactions((prev) => [newTx, ...prev.slice(0, pageSize - 1)]);
        setTotal((t) => t + 1);
      }
    });
    return () => unsub();
  }, [page, filters, pageSize]);

  const handleFilterChange = (newFilters: TransactionFilterState) => {
    setFilters(newFilters);
    setPage(1);

    const params: Record<string, string> = {};
    if (newFilters.search) params.search = newFilters.search;
    if (newFilters.risk_level !== "all") params.risk_level = newFilters.risk_level;
    if (newFilters.recommended_action !== "all") params.recommended_action = newFilters.recommended_action;
    if (newFilters.status !== "all") params.status = newFilters.status;
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    const defaultFilters: TransactionFilterState = {
      search: "",
      risk_level: "all",
      recommended_action: "all",
      status: "all",
    };
    setFilters(defaultFilters);
    setSearchParams({});
    setPage(1);
  };

  const handleSortChange = (field: "timestamp" | "amount" | "risk_score") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <TransactionFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={total}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={fetchTransactions}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Table */}
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
};
