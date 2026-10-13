import React from "react";
import type { DashboardSummary } from "../../types";
import { StatCard } from "../ui/StatCard";
import { Activity, ShieldAlert, Briefcase, Zap } from "lucide-react";
import { formatNumber } from "../../lib/utils";

interface KpiMetricsProps {
  summary: DashboardSummary | null;
  isLoading?: boolean;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl p-5 skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Transactions Processed"
        value={formatNumber(summary.total_transactions)}
        icon={<Activity className="w-5 h-5" />}
        trend={summary.trends.total_transactions}
        trendDirection="up"
        isDemo={true}
        indicatorColor="forest"
      />
      <StatCard
        title="High-Risk Alerts"
        value={formatNumber(summary.high_risk_alerts)}
        icon={<ShieldAlert className="w-5 h-5" />}
        trend={summary.trends.high_risk_alerts}
        trendDirection="down"
        isDemo={true}
        indicatorColor="critical"
      />
      <StatCard
        title="Cases In Review"
        value={summary.cases_under_investigation}
        icon={<Briefcase className="w-5 h-5" />}
        trend={summary.trends.cases_under_investigation}
        trendDirection="neutral"
        isDemo={true}
        indicatorColor="gold"
      />
      <StatCard
        title="Detection Latency"
        value={
          summary.avg_detection_latency_ms != null
            ? `${summary.avg_detection_latency_ms} ms`
            : "Benchmark Pending"
        }
        icon={<Zap className="w-5 h-5" />}
        trend={summary.trends?.avg_detection_latency_ms || "Hardware runner pending"}
        trendDirection="neutral"
        isDemo={true}
        indicatorColor="sage"
      />
    </div>
  );
};
