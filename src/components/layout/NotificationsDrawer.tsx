import React from "react";
import type { Alert } from "../../types";
import { X, ShieldAlert, AlertTriangle, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "../../lib/utils";
import { RiskBadge } from "../ui/Badge";
import { useNavigate } from "react-router-dom";

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ background: "rgba(30,77,53,0.35)" }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md flex flex-col animate-slide-up"
          style={{
            background: "var(--color-bg-card)",
            borderLeft: "1px solid var(--color-border)",
            boxShadow: "-10px 0 40px rgba(30,77,53,0.12)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-bg-soft)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: "rgba(168,25,15,0.08)",
                  color: "#A8190F",
                  border: "1px solid rgba(168,25,15,0.15)",
                }}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3
                  className="text-sm font-bold"
                  style={{ color: "var(--color-ink)", fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Risk & AML Alerts
                </h3>
                <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                  Real-time algorithmic trigger stream
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--color-ink-2)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--color-ink-2)" }}>
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-ink-3)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  No alerts detected
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-ink-3)" }}>
                  New high-risk transactions will appear here in real time.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-xl cursor-pointer group transition-all"
                  style={{
                    background: "var(--color-bg-soft)",
                    border: "1px solid var(--color-border)",
                  }}
                  onClick={() => {
                    onClose();
                    if (alert.transaction_id) {
                      navigate(`/transactions/${alert.transaction_id}`);
                    } else if (alert.account_id) {
                      navigate(`/network?account=${alert.account_id}`);
                    }
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent-2)";
                    (e.currentTarget as HTMLElement).style.background = "var(--color-accent-muted)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
                    (e.currentTarget as HTMLElement).style.background = "var(--color-bg-soft)";
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <RiskBadge level={alert.severity} score={alert.risk_score} />
                    <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-3)" }}>
                      {formatRelativeTime(alert.detected_at)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                    {alert.alert_type}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                    {alert.explanation}
                  </p>

                  <div
                    className="mt-3 pt-2 flex items-center justify-between text-[11px]"
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <span className="font-mono font-semibold" style={{ color: "var(--color-accent)" }}>
                      {alert.transaction_id || alert.account_id}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 font-semibold"
                      style={{ color: "var(--color-accent-2)" }}
                    >
                      Investigate <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className="p-4 flex items-center justify-between text-xs"
            style={{
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-bg-soft)",
              color: "var(--color-ink-2)",
            }}
          >
            <span>Synthetic evaluation feed</span>
            <button
              onClick={() => { onClose(); navigate("/transactions"); }}
              className="font-semibold transition-colors hover:underline"
              style={{ color: "var(--color-accent-2)" }}
            >
              View all transactions →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
