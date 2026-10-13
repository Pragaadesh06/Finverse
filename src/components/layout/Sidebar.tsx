import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Share2,
  Briefcase,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  LogOut,
  User,
  FileDown,
  UploadCloud,
  ShieldAlert,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { FinverseLogo } from "../common/FinverseLogo";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const institutionalNavItems = [
  {
    to: "/dashboard",
    label: "Command Center",
    icon: LayoutDashboard,
    badge: "LIVE",
    badgeStyle: { background: "rgba(46,125,82,0.25)", color: "#A8D5B5", border: "1px solid rgba(168,213,181,0.30)" },
  },
  {
    to: "/risk-monitor",
    label: "Risk Monitor",
    icon: ShieldAlert,
    badge: "GATE",
    badgeStyle: { background: "rgba(192,57,43,0.20)", color: "#FF7B72", border: "1px solid rgba(255,123,114,0.30)" },
  },
  {
    to: "/transactions",
    label: "Transaction Monitor",
    icon: ArrowRightLeft,
  },
  {
    to: "/simulator",
    label: "Scenario Simulator",
    icon: Sliders,
    badge: "AI/ML",
    badgeStyle: { background: "rgba(180,154,99,0.20)", color: "#E0C895", border: "1px solid rgba(224,200,149,0.30)" },
  },
  {
    to: "/network",
    label: "AML Network",
    icon: Share2,
    badge: "GNN",
    badgeStyle: { background: "rgba(184,134,11,0.20)", color: "#D4A017", border: "1px solid rgba(212,160,23,0.25)" },
  },
  {
    to: "/cases",
    label: "Investigation Cases",
    icon: Briefcase,
  },
  {
    to: "/import",
    label: "Import Data",
    icon: UploadCloud,
  },
  {
    to: "/export",
    label: "Export Center",
    icon: FileDown,
  },
  {
    to: "/analytics",
    label: "Model Evaluation",
    icon: BarChart3,
  },
];

const customerNavItems = [
  {
    to: "/customer/dashboard",
    label: "Account Overview",
    icon: LayoutDashboard,
  },
  {
    to: "/customer/transactions",
    label: "My Transactions",
    icon: ArrowRightLeft,
  },
  {
    to: "/customer/disputes",
    label: "Disputes & Reports",
    icon: ShieldAlert,
    badge: "SAFE",
    badgeStyle: { background: "rgba(46,125,82,0.25)", color: "#A8D5B5", border: "1px solid rgba(168,213,181,0.30)" },
  },
  {
    to: "/customer/export",
    label: "Download Statement",
    icon: FileDown,
  },
  {
    to: "/customer/profile",
    label: "Security & Profile",
    icon: User,
  },
  {
    to: "/customer/support",
    label: "Help & Safety",
    icon: HelpCircle,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isCustomer = user?.role === "customer";
  const navItems = isCustomer ? customerNavItems : institutionalNavItems;

  const roleLabel: Record<string, string> = {
    customer: "Client Account",
    analyst: "AML Analyst",
    senior_analyst: "Senior Analyst",
    compliance_officer: "Compliance Officer",
    manager: "Risk Manager",
    admin: "Administrator",
  };

  const sidebarWidth = isCollapsed ? "w-[68px]" : "w-64";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          style={{ background: "rgba(30,77,53,0.35)" }}
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col sidebar-transition",
          "lg:static lg:translate-x-0",
          sidebarWidth,
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* ── Brand Header ── */}
        <div
          className="flex items-center justify-between px-4 py-5"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <div className={cn("flex items-center gap-3 min-w-0", isCollapsed && "justify-center w-full")}>
            <FinverseLogo size={36} />

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      color: "rgba(250,247,240,0.95)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Finverse
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(184,134,11,0.20)",
                      color: "#D4A017",
                      border: "1px solid rgba(212,160,23,0.25)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    v3.4
                  </span>
                </div>
                <p
                  className="text-[10px] truncate mt-0.5"
                  style={{ color: "var(--sidebar-muted)", letterSpacing: "0.02em" }}
                >
                  Risk Intelligence Platform
                </p>
              </div>
            )}
          </div>

          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-lg transition-all flex-shrink-0"
            style={{ color: "var(--sidebar-muted)" }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* ── Workflow Pill (only when expanded) ── */}
        {!isCollapsed && (
          <div className="px-4 pt-4">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="text-[9px] uppercase font-mono font-bold tracking-widest mb-1"
                style={{ color: "var(--sidebar-muted)" }}
              >
                {isCustomer ? "Client Safeguards" : "Platform Workflow"}
              </div>
              <div className="text-xs font-medium" style={{ color: "rgba(250,247,240,0.85)" }}>
                {isCustomer ? (
                  <>
                    Transact <span style={{ color: "#D4A017" }}>→</span> Review <span style={{ color: "#D4A017" }}>→</span> Protect
                  </>
                ) : (
                  <>
                    Detect <span style={{ color: "#D4A017" }}>→</span> Understand <span style={{ color: "#D4A017" }}>→</span> Orchestrate
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div
              className="px-2 pb-2 text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: "var(--sidebar-muted)" }}
            >
              {isCustomer ? "Customer Portal" : "Analyst Workspace"}
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to === "/transactions" && location.pathname.startsWith("/transactions/"));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group relative",
                  isCollapsed
                    ? "justify-center w-10 h-10 mx-auto"
                    : "justify-between px-3 py-2.5"
                )}
                style={{
                  background: isActive ? "var(--sidebar-active)" : "transparent",
                  color: isActive ? "rgba(250,247,240,0.95)" : "rgba(250,247,240,0.65)",
                  borderLeft: isActive && !isCollapsed ? "2px solid #D4A017" : "2px solid transparent",
                }}
              >
                <div className={cn("flex items-center", isCollapsed ? "" : "gap-3")}>
                  <Icon
                    className="w-4 h-4 flex-shrink-0 transition-colors"
                    style={{
                      color: isActive ? "#D4A017" : "rgba(168,213,181,0.70)",
                    }}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <>
                    {item.badge ? (
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={item.badgeStyle}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight
                        className={cn(
                          "w-3 h-3 transition-all duration-150",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                        )}
                        style={{ color: "#D4A017" }}
                      />
                    )}
                  </>
                )}

                {/* Collapsed tooltip */}
                {isCollapsed && (
                  <div
                    className="absolute left-full ml-2 z-50 px-2 py-1 rounded-lg text-xs font-semibold
                               pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap"
                    style={{
                      background: "rgba(30,77,53,0.95)",
                      color: "rgba(250,247,240,0.95)",
                      border: "1px solid rgba(168,213,181,0.20)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ── User Footer ── */}
        <div
          className="p-3 mt-auto"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          {user && (
            <div
              className={cn(
                "flex items-center rounded-xl p-2 transition-all group",
                isCollapsed ? "justify-center" : "gap-2.5"
              )}
            >
              {/* Avatar */}
              <div
                className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                style={{ background: user.avatarColor }}
              >
                {user.initials}
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2"
                  style={{
                    background: "#2E7D52",
                    borderColor: "var(--sidebar-bg)",
                  }}
                />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: "rgba(250,247,240,0.90)" }}
                  >
                    {user.name}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: "var(--sidebar-muted)" }}
                  >
                    {roleLabel[user.role] || user.role}
                  </div>
                </div>
              )}

              {/* Logout */}
              {!isCollapsed && (
                <div className="relative">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="p-1.5 rounded-lg transition-all hover:bg-white/10"
                    style={{ color: "var(--sidebar-muted)" }}
                    title="Sign out"
                    id="sidebar-logout-btn"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>

                  {showLogoutConfirm && (
                    <div
                      className="absolute bottom-8 right-0 z-50 p-3 rounded-xl w-48 text-xs animate-scale-in"
                      style={{
                        background: "rgba(19,26,20,0.97)",
                        border: "1px solid rgba(168,213,181,0.15)",
                        backdropFilter: "blur(12px)",
                        color: "rgba(250,247,240,0.85)",
                      }}
                    >
                      <p className="font-semibold mb-2">Sign out of Finverse?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={logout}
                          className="flex-1 py-1 rounded-lg font-semibold text-center transition-all"
                          style={{ background: "#A8190F", color: "#FAF7F0" }}
                          id="confirm-logout-btn"
                        >
                          Sign out
                        </button>
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 py-1 rounded-lg font-semibold text-center transition-all"
                          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(250,247,240,0.70)" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Collapsed: show user icon + logout tooltip */}
          {isCollapsed && user && (
            <button
              onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
              className="relative flex items-center justify-center w-full mt-2 p-1.5 rounded-lg transition-all hover:bg-white/10 group"
              style={{ color: "var(--sidebar-muted)" }}
              title="Sign out"
            >
              <User className="w-4 h-4" />
              {showLogoutConfirm && (
                <div
                  className="absolute bottom-8 left-full ml-2 z-50 p-3 rounded-xl w-48 text-xs animate-scale-in"
                  style={{
                    background: "rgba(19,26,20,0.97)",
                    border: "1px solid rgba(168,213,181,0.15)",
                    backdropFilter: "blur(12px)",
                    color: "rgba(250,247,240,0.85)",
                  }}
                >
                  <p className="font-semibold mb-1">{user.name}</p>
                  <p style={{ color: "var(--sidebar-muted)" }} className="mb-2">
                    {roleLabel[user.role]}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); logout(); }}
                    className="w-full py-1 rounded-lg font-semibold text-center"
                    style={{ background: "#A8190F", color: "#FAF7F0" }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
