import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import type { DashboardSummary } from "../../types";

// Finverse old-money risk palette
const RISK_COLORS = {
  "Low Risk":      "#2E7D52",
  "Medium Risk":   "#B8860B",
  "High Risk":     "#C2440A",
  "Critical Risk": "#A8190F",
};

interface RiskDistributionChartProps {
  distribution: DashboardSummary["risk_distribution"];
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  distribution,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Risk Distribution</CardTitle>
          <CardDescription>Categorized risk profiles across portfolio</CardDescription>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{
            background: "var(--color-bg-subtle)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink-3)",
          }}
        >
          0–100 Scale
        </span>
      </CardHeader>

      <CardContent className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
            />
            <YAxis
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(46,125,82,0.05)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      className="rounded-xl p-3 text-xs shadow-elevated"
                      style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div className="font-bold" style={{ color: "var(--color-ink)" }}>
                        {data.label}
                      </div>
                      <div className="mt-1" style={{ color: "var(--color-ink-2)" }}>
                        Volume:{" "}
                        <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>
                          {data.count.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div style={{ color: "var(--color-ink-2)" }}>
                        Share:{" "}
                        <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>
                          {data.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {distribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={RISK_COLORS[entry.label as keyof typeof RISK_COLORS] || entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
