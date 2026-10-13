import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  Play,
  Square,
  Server,
  Sparkles,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { SearchBar } from "../ui/SearchBar";
import { Modal } from "../ui/Modal";
import { apiConfig } from "../../services/apiClient";
import { simulationService } from "../../services/simulationService";
import { realtimeStream, ConnectionStatus } from "../../services/websocketService";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { dashboardService } from "../../services/dashboardService";
import type { Alert, AppDataSourceMode } from "../../types";
import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  isSidebarCollapsed?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  const [isSimulating, setIsSimulating] = useState<boolean>(simulationService.isSimulating());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(realtimeStream.getStatus());
  const [dataSourceMode, setDataSourceMode] = useState<AppDataSourceMode>(apiConfig.getMode());
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    // Only fetch institutional alerts if not customer
    if (!isCustomer) {
      dashboardService.getRecentAlerts().then(setAlerts).catch(() => {});

      const unsubAlert = realtimeStream.onAlert((newAlert) => {
        setAlerts((prev) => [newAlert, ...prev.slice(0, 30)]);
      });
      return () => {
        unsubAlert();
      };
    }
  }, [isCustomer]);

  useEffect(() => {
    const unsubStatus = realtimeStream.onStatus((status) => {
      setConnectionStatus(status);
    });
    const unsubSim = simulationService.onStatusChange((running) => {
      setIsSimulating(running);
    });
    const unsubMode = apiConfig.onModeChange((mode) => {
      setDataSourceMode(mode);
    });

    realtimeStream.connect();

    return () => {
      unsubStatus();
      unsubSim();
      unsubMode();
    };
  }, []);

  const handleToggleSimulation = async () => {
    if (isSimulating) {
      await simulationService.stopSimulation();
      setIsSimulating(false);
    } else {
      await simulationService.startSimulation();
      setIsSimulating(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      if (isCustomer) {
        navigate(`/customer/transactions?search=${encodeURIComponent(globalSearch.trim())}`);
      } else {
        navigate(`/transactions?search=${encodeURIComponent(globalSearch.trim())}`);
      }
    }
  };

  const getPageMeta = () => {
    const path = location.pathname;
    if (path === "/dashboard") {
      return { title: "Risk Command Center", subtitle: "Real-time financial risk & AML intelligence" };
    }
    if (path === "/risk-monitor") {
      return { title: "Risk Monitor", subtitle: "Real-time transaction gate & screening thresholds" };
    }
    if (path === "/simulator") {
      return { title: "Counterfactual Simulator", subtitle: "Hypothetical scenario screening & feature delta" };
    }
    if (path.startsWith("/transactions/")) {
      const id = path.split("/")[2];
      return {
        title: "Transaction Investigation",
        subtitle: `Explainable risk assessment — ${id}`,
        parent: isCustomer ? "My Transactions" : "Transactions",
        parentLink: isCustomer ? "/customer/transactions" : "/transactions",
      };
    }
    if (path === "/transactions") {
      return { title: "Transaction Monitor", subtitle: "Stream monitoring & heuristic flags" };
    }
    if (path === "/network") {
      return { title: "AML Network Explorer", subtitle: "Interactive entity & cycle graph" };
    }
    if (path === "/cases") {
      return { title: "Investigation Cases", subtitle: "Triage, assignment & audit history" };
    }
    if (path === "/import") {
      return { title: "Import Data", subtitle: "Ingest CSV/XLSX ledgers into unified pipeline" };
    }
    if (path === "/export") {
      return { title: "Export Center", subtitle: "Verified risk reports & audit statements" };
    }
    if (path === "/analytics") {
      return { title: "Model Evaluation", subtitle: "Precision, recall & benchmark validation" };
    }
    // Customer Portal routes
    if (path === "/customer/dashboard") {
      return { title: "Account Overview", subtitle: "Personal financial activity & balance protection" };
    }
    if (path === "/customer/transactions") {
      return { title: "My Transactions", subtitle: "Authorized payment records & status explanations" };
    }
    if (path === "/customer/disputes") {
      return { title: "Disputes & Reports", subtitle: "Report suspicious transfers & monitor investigation status" };
    }
    if (path === "/customer/export") {
      return { title: "Download Statement", subtitle: "Export personal transaction statements as CSV" };
    }
    if (path === "/customer/profile") {
      return { title: "Security Profile", subtitle: "Authentication settings & account protection" };
    }
    if (path === "/customer/support") {
      return { title: "Help & Safety", subtitle: "Customer assistance & suspicious activity reporting guide" };
    }
    if (path === "/access-denied") {
      return { title: "Access Restricted", subtitle: "Permission denied for requested resource" };
    }
    return { title: "Finverse", subtitle: "Financial Risk Intelligence Platform" };
  };

  const meta = getPageMeta();

  // Derive connection status color
  const connColor =
    connectionStatus === "connected"
      ? "#2E7D52"
      : connectionStatus === "connecting"
      ? "#B8860B"
      : "#8C8776";

  return (
    <>
      <header
        className="sticky top-0 z-30 transition-all"
        style={{
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--color-border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* ── Left: Mobile burger + Page title ── */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onToggleMobileSidebar}
              className="p-2 rounded-xl transition-colors lg:hidden flex-shrink-0"
              style={{ color: "var(--color-ink-2)" }}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              {/* Breadcrumb */}
              <div
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: "var(--color-ink-3)" }}
              >
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    color: "var(--color-accent-2)",
                    fontWeight: 600,
                  }}
                >
                  Finverse
                </span>
                {meta.parent && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() => navigate(meta.parentLink || "/")}
                      className="hover:underline transition-colors"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {meta.parent}
                    </button>
                  </>
                )}
                <span>/</span>
                <span style={{ color: "var(--color-ink)" }} className="font-medium truncate">
                  {meta.title}
                </span>
              </div>

              <h1
                className="text-base sm:text-lg font-bold tracking-tight mt-0.5 truncate"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "'Onest', sans-serif",
                }}
              >
                {meta.title}
              </h1>
            </div>
          </div>

          {/* ── Center: Search ── */}
          <div className="hidden md:flex flex-1 max-w-sm mx-3">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <SearchBar
                value={globalSearch}
                onChangeValue={setGlobalSearch}
                placeholder="Search transactions, accounts, cases…"
                shortcut="↵"
              />
            </form>
          </div>

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stream Controls (Analysts / Admins only) */}
            {!isCustomer && (
              <div
                className="hidden sm:flex items-center gap-1 p-1 rounded-xl"
                style={{
                  background: "var(--color-bg-soft)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {/* Simulation toggle */}
                <button
                  onClick={handleToggleSimulation}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all select-none",
                  )}
                  style={{
                    background: isSimulating ? "var(--color-accent-muted)" : "transparent",
                    color: isSimulating ? "var(--color-accent)" : "var(--color-ink-2)",
                    border: isSimulating ? "1px solid rgba(46,125,82,0.20)" : "1px solid transparent",
                  }}
                  title={isSimulating ? "Stop synthetic stream" : "Start synthetic stream"}
                >
                  {isSimulating ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ background: "#2E7D52" }}
                        />
                        <span
                          className="relative inline-flex rounded-full h-2 w-2"
                          style={{ background: "#2E7D52" }}
                        />
                      </span>
                      <span className="hidden lg:inline">Stream Active</span>
                      <Square className="w-3 h-3 ml-0.5 fill-current" style={{ color: "#2E7D52" }} />
                    </>
                  ) : (
                    <>
                      <Play
                        className="w-3 h-3 fill-current"
                        style={{ color: "var(--color-ink-2)" }}
                      />
                      <span className="hidden lg:inline">Start Stream</span>
                    </>
                  )}
                </button>

                {/* Data source mode */}
                <button
                  onClick={() => setIsModeModalOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ color: "var(--color-ink-2)" }}
                  title="Switch data source"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: connColor }}
                  />
                  <Server className="w-3.5 h-3.5" style={{ color: "var(--color-accent-2)" }} />
                  <span className="hidden xl:inline text-[11px] font-mono" style={{ color: "var(--color-ink-2)" }}>
                    {dataSourceMode === "mock" ? "Mock" : "FastAPI"}
                  </span>
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all"
              style={{
                color: "var(--color-ink-2)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-soft)",
              }}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              id="theme-toggle-btn"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Notifications Bell (Institutional only) */}
            {!isCustomer && (
              <button
                onClick={() => setIsAlertsDrawerOpen(true)}
                className="relative p-2 rounded-xl transition-all"
                style={{
                  color: "var(--color-ink-2)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-soft)",
                }}
                aria-label="View notifications"
                id="notifications-bell-btn"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                    style={{ background: "#A8190F" }}
                  >
                    {alerts.length > 9 ? "9+" : alerts.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={alerts}
      />

      {/* Mode Switcher Modal */}
      <Modal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        title="Data Source Configuration"
        subtitle="Toggle between local simulation engine and live FastAPI backend"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
            Finverse provides complete autonomy via deterministic synthetic streaming while maintaining
            a strict contract ready to connect to the Python FastAPI backend.
          </p>

          <div className="space-y-3">
            {/* Mock Mode */}
            <div
              onClick={() => { apiConfig.setMode("mock"); setIsModeModalOpen(false); }}
              className="p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5"
              style={{
                borderColor: dataSourceMode === "mock" ? "var(--color-accent-2)" : "var(--color-border)",
                background: dataSourceMode === "mock" ? "var(--color-accent-muted)" : "var(--color-bg-card)",
              }}
            >
              <div
                className="p-2 rounded-lg mt-0.5"
                style={{ background: "var(--color-accent-muted)", color: "var(--color-accent-2)" }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                    Mock Simulation Mode
                  </h4>
                  {dataSourceMode === "mock" && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--color-accent-2)" }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>
                  Self-contained high-fidelity synthetic transactions with real-time streaming.
                </p>
                <div
                  className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded inline-block font-semibold"
                  style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}
                >
                  Zero external dependencies · Hackathon Ready
                </div>
              </div>
            </div>

            {/* Backend Mode */}
            <div
              onClick={() => { apiConfig.setMode("backend"); setIsModeModalOpen(false); }}
              className="p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5"
              style={{
                borderColor: dataSourceMode === "backend" ? "var(--color-accent-2)" : "var(--color-border)",
                background: dataSourceMode === "backend" ? "var(--color-accent-muted)" : "var(--color-bg-card)",
              }}
            >
              <div
                className="p-2 rounded-lg mt-0.5"
                style={{ background: "var(--color-bg-soft)", color: "var(--color-accent-2)" }}
              >
                <Server className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                    FastAPI Backend Mode
                  </h4>
                  {dataSourceMode === "backend" && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--color-accent-2)" }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>
                  Connects to{" "}
                  <code
                    className="font-mono px-1 rounded text-xs"
                    style={{ background: "var(--color-bg-subtle)", color: "var(--color-ink)" }}
                  >
                    http://localhost:8000
                  </code>{" "}
                  and WebSocket{" "}
                  <code
                    className="font-mono px-1 rounded text-xs"
                    style={{ background: "var(--color-bg-subtle)", color: "var(--color-ink)" }}
                  >
                    /ws/transactions
                  </code>
                  .
                </p>
                <div
                  className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded inline-block font-semibold"
                  style={{ background: "var(--color-gold-muted)", color: "var(--color-gold)" }}
                >
                  Requires Python FastAPI running locally
                </div>
              </div>
            </div>
          </div>

          <div
            className="pt-3 flex justify-end"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <Button variant="secondary" size="sm" onClick={() => setIsModeModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
