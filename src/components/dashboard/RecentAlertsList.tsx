import React from "react";
import { useNavigate } from "react-router-dom";
import type { Alert } from "../../types";
import { formatRelativeTime } from "../../lib/utils";
import { RiskBadge } from "../ui/Badge";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";

interface RecentAlertsListProps {
  alerts: Alert[];
  isLoading?: boolean;
}

export const RecentAlertsList: React.FC<RecentAlertsListProps> = ({ alerts, isLoading }) => {
  const navigate = useNavigate();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{
              background: "rgba(168,25,15,0.08)",
              color: "#A8190F",
              border: "1px solid rgba(168,25,15,0.15)",
            }}
          >
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <CardTitle>High-Risk Alerts</CardTitle>
            <CardDescription>Heuristic & ML trigger events</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-3 rounded w-1/3" />
                <div className="skeleton h-4 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-xs" style={{ color: "var(--color-ink-3)" }}>
            No active high-risk alerts.
          </div>
        ) : (
          alerts.slice(0, 6).map((alert, i) => (
            <div
              key={alert.id}
              onClick={() => {
                if (alert.transaction_id) {
                  navigate(`/transactions/${alert.transaction_id}`);
                } else if (alert.account_id) {
                  navigate(`/network?account=${alert.account_id}`);
                }
              }}
              className="px-5 py-4 cursor-pointer transition-colors group"
              style={{
                borderBottom: i < 5 ? "1px solid var(--color-border-soft)" : undefined,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--color-accent-muted)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <RiskBadge level={alert.severity} score={alert.risk_score} />
                <span className="text-[10px] font-mono" style={{ color: "var(--color-ink-3)" }}>
                  {formatRelativeTime(alert.detected_at)}
                </span>
              </div>

              <h4 className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
                {alert.alert_type}
              </h4>
              <p
                className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                style={{ color: "var(--color-ink-2)" }}
              >
                {alert.explanation}
              </p>

              <div
                className="mt-2.5 pt-2 flex items-center justify-between text-[11px]"
                style={{ borderTop: "1px solid var(--color-border-soft)" }}
              >
                <span className="font-mono font-semibold" style={{ color: "var(--color-accent)" }}>
                  {alert.transaction_id || alert.account_id}
                </span>
                <span
                  className="font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  style={{ color: "var(--color-accent-2)" }}
                >
                  Investigate <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
