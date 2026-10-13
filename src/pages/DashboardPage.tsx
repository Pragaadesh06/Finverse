import React, { useState, useEffect } from "react";
import { dashboardService } from "../services/dashboardService";
import { transactionService } from "../services/transactionService";
import { simulationService } from "../services/simulationService";
import { realtimeStream } from "../services/websocketService";
import { DashboardSummary, Transaction, Alert } from "../types";
import { KpiMetrics } from "../components/dashboard/KpiMetrics";
import { RiskDistributionChart } from "../components/dashboard/RiskDistributionChart";
import { DecisionsChart } from "../components/dashboard/DecisionsChart";
import { VolumeOverTimeChart } from "../components/dashboard/VolumeOverTimeChart";
import { LiveFeedTable } from "../components/dashboard/LiveFeedTable";
import { RecentAlertsList } from "../components/dashboard/RecentAlertsList";
import { Button } from "../components/ui/Button";
import { Play, Square, Calendar, RefreshCw, AlertCircle } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(simulationService.isSimulating());
  const [dateRange, setDateRange] = useState("24h");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, txRes, alertRes] = await Promise.all([
        dashboardService.getSummary(),
        transactionService.getTransactions({ limit: 15 }),
        dashboardService.getRecentAlerts(),
      ]);
      setSummary(sumRes);
      setTransactions(txRes.items);
      setAlerts(alertRes);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Stream listeners
    const unsubTx = realtimeStream.onTransaction((newTx: Transaction) => {
      setTransactions((prev) => [newTx, ...prev.slice(0, 40)]);
      setSummary((prev: DashboardSummary | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_transactions: prev.total_transactions + 1,
        };
      });
    });

    const unsubAlert = realtimeStream.onAlert((newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev.slice(0, 20)]);
      setSummary((prev: DashboardSummary | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          high_risk_alerts: prev.high_risk_alerts + 1,
        };
      });
    });

    const unsubSim = simulationService.onStatusChange((running: boolean) => {
      setIsSimulating(running);
    });

    return () => {
      unsubTx();
      unsubAlert();
      unsubSim();
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

  return (
    <div className="space-y-6">
      {/* Top Banner / Date Range and Simulation Actions */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl transition-all"
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
              Risk Command Center
            </h2>
            <span
              className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "var(--color-accent-muted)",
                color: "var(--color-accent)",
                border: "1px solid rgba(46,125,82,0.25)",
              }}
            >
              Real-Time
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
            Continuous anomaly monitoring, money flow typologies, and automated orchestration decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date range picker */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "var(--color-bg-soft)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Calendar className="w-3.5 h-3.5 ml-1.5" style={{ color: "var(--color-ink-3)" }} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs bg-transparent border-none font-medium focus:outline-none pr-2 py-1 cursor-pointer"
              style={{ color: "var(--color-ink)" }}
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className={isLoading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />}
          >
            Refresh
          </Button>

          {/* Simulation Toggle */}
          <Button
            variant={isSimulating ? "secondary" : "primary"}
            size="sm"
            onClick={handleToggleSimulation}
            leftIcon={
              isSimulating ? (
                <Square className="w-3.5 h-3.5 text-red-600 fill-red-600" />
              ) : (
                <Play className="w-3.5 h-3.5 text-white fill-white" />
              )
            }
          >
            {isSimulating ? "Pause Simulation" : "Start Simulation"}
          </Button>
        </div>
      </div>

      {/* Error state if API call failed */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Section */}
      <KpiMetrics summary={summary} isLoading={isLoading} />

      {/* Analytics Section (3 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskDistributionChart
            distribution={
              summary?.risk_distribution || [
                { range: "0-34", label: "Low Risk", count: 64000, percentage: 76.0, color: "#10B981" },
                { range: "35-64", label: "Medium Risk", count: 12500, percentage: 14.8, color: "#F59E0B" },
                { range: "65-84", label: "High Risk", count: 5400, percentage: 6.4, color: "#F97316" },
                { range: "85-100", label: "Critical Risk", count: 2300, percentage: 2.8, color: "#EF4444" },
              ]
            }
          />
        </div>

        <div className="lg:col-span-1">
          <DecisionsChart
            decisions={
              summary?.decisions_breakdown || [
                { action: "allow", label: "Allowed", count: 68000, percentage: 80.8, color: "#10B981" },
                { action: "step_up_verification", label: "Step-Up 2FA", count: 8900, percentage: 10.6, color: "#F59E0B" },
                { action: "manual_review", label: "Manual Review", count: 4800, percentage: 5.7, color: "#F97316" },
                { action: "hold_for_review", label: "Hold for AML", count: 2500, percentage: 2.9, color: "#EF4444" },
              ]
            }
          />
        </div>

        <div className="lg:col-span-1">
          <VolumeOverTimeChart
            volumeData={
              summary?.volume_over_time || [
                { time: "06:00", count: 4200, flagged_count: 140, total_volume: 820000 },
                { time: "08:00", count: 6800, flagged_count: 210, total_volume: 1450000 },
                { time: "10:00", count: 11200, flagged_count: 480, total_volume: 3100000 },
                { time: "12:00", count: 14500, flagged_count: 620, total_volume: 4250000 },
                { time: "14:00", count: 16800, flagged_count: 790, total_volume: 5120000 },
                { time: "16:00", count: 15100, flagged_count: 710, total_volume: 4680000 },
                { time: "18:00", count: 10200, flagged_count: 390, total_volume: 2950000 },
              ]
            }
          />
        </div>
      </div>

      {/* Main Bottom Section: Live Feed (2/3) + Recent Alerts (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveFeedTable transactions={transactions} isLoading={isLoading} />
        </div>

        <div className="lg:col-span-1">
          <RecentAlertsList alerts={alerts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
