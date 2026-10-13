import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { caseService } from "../services/caseService";
import { Case } from "../types";
import { formatRelativeTime } from "../lib/utils";
import { RiskBadge, CaseStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Tabs, TabItem } from "../components/ui/Tabs";
import { SearchBar } from "../components/ui/SearchBar";
import { CaseDetailDrawer } from "../components/cases/CaseDetailDrawer";
import { CreateCaseModal } from "../components/cases/CreateCaseModal";
import {
  Plus,
  ArrowUpRight,
  RefreshCw,
  FolderOpen,
  User,
} from "lucide-react";

export const CasesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get("id");

  const [cases, setCases] = useState<Case[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await caseService.getCases({
        status: activeTab,
        search: search || undefined,
      });
      setCases(data);

      if (caseIdParam) {
        const target = data.find((c) => c.id === caseIdParam || c.case_id === caseIdParam);
        if (target) setSelectedCase(target);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [activeTab, search]);

  const tabs: TabItem[] = [
    { id: "all", label: "All Cases", count: cases.length },
    {
      id: "open",
      label: "Open",
      count: cases.filter((c) => c.status === "open").length,
    },
    {
      id: "in_review",
      label: "In Review",
      count: cases.filter((c) => c.status === "in_review").length,
    },
    {
      id: "resolved",
      label: "Resolved",
      count: cases.filter((c) => c.status === "resolved").length,
    },
  ];

  const handleCaseUpdated = (updated: Case) => {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCase(updated);
  };

  const handleCaseCreated = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    setSelectedCase(newCase);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className="p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-lg font-bold tracking-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "var(--color-ink)",
              }}
            >
              Investigation Case Management
            </h2>
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-accent-muted)",
                color: "var(--color-accent)",
                border: "1px solid rgba(46,125,82,0.25)",
              }}
            >
              Audit Ready
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
            Triage SAR filing workflows, track multi-entity money laundering rings, and maintain investigator logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCases}
            leftIcon={<RefreshCw className={isLoading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Investigation Case
          </Button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChangeValue={setSearch}
            placeholder="Search cases or analysts…"
            className="py-1"
          />
        </div>
      </div>

      {/* Cases Table */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
        }}
      >
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-bg-soft)",
                  color: "var(--color-ink-2)",
                }}
              >
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Title & Typology</th>
                <th className="py-3.5 px-4 text-center">Severity</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Assigned Officer</th>
                <th className="py-3.5 px-4">Updated</th>
                <th className="py-3.5 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs" style={{ borderColor: "var(--color-border)" }}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div
                        className="h-4 rounded w-full"
                        style={{ background: "var(--color-bg-soft)" }}
                      />
                    </td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center" style={{ color: "var(--color-ink-2)" }}>
                    <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-ink-3)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                      No cases found
                    </p>
                    <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: "var(--color-ink-2)" }}>
                      There are currently no investigation cases matching the selected filter.
                    </p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className="table-row-hover cursor-pointer group"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap" style={{ color: "var(--color-ink)" }}>
                      <span className="group-hover:underline" style={{ color: "var(--color-accent-2)" }}>
                        {c.case_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold" style={{ color: "var(--color-ink)" }}>
                        {c.title}
                      </div>
                      <div className="text-[11px] capitalize mt-0.5" style={{ color: "var(--color-ink-3)" }}>
                        {c.case_type.replace(/_/g, " ")} • {c.related_accounts.length} linked accounts
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <RiskBadge level={c.severity} />
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <CaseStatusBadge status={c.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium" style={{ color: "var(--color-ink)" }}>
                        <User className="w-3.5 h-3.5" style={{ color: "var(--color-accent-2)" }} />
                        <span>{c.assigned_analyst}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--color-ink-2)" }}>
                      <div>{formatRelativeTime(c.updated_at)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(c);
                        }}
                        className="p-1.5 rounded-lg transition-colors hover:scale-110"
                        style={{ color: "var(--color-ink-3)" }}
                        title="View Full Case Dossier"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Slide-Over Drawer */}
      <CaseDetailDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onUpdate={handleCaseUpdated}
      />

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCaseCreated}
      />
    </div>
  );
};

export default CasesPage;
