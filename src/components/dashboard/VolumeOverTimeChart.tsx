import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { DashboardSummary } from "../../types";

interface VolumeOverTimeChartProps {
  volumeData: DashboardSummary["volume_over_time"];
}

export const VolumeOverTimeChart: React.FC<VolumeOverTimeChartProps> = ({ volumeData }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Transaction Volume & Anomaly Rate</CardTitle>
          <CardDescription>
            Hourly processing throughput with suspicious anomaly overlays
          </CardDescription>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--color-accent-2)" }}
            />
            <span style={{ color: "var(--color-ink-2)" }}>Total Tx</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span style={{ color: "var(--color-ink-2)" }}>Flagged Anomaly</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E7D52" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2E7D52" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A8190F" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#A8190F" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      className="rounded-xl p-3 shadow-lg text-xs"
                      style={{
                        background: "var(--color-bg-card)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-ink)",
                      }}
                    >
                      <div className="font-bold mb-1" style={{ color: "var(--color-ink)" }}>
                        Time: {label}
                      </div>
                      <div className="font-medium" style={{ color: "var(--color-accent-2)" }}>
                        Total Volume:{" "}
                        <span className="font-mono font-semibold" style={{ color: "var(--color-ink)" }}>
                          {payload[0]?.value?.toLocaleString()}
                        </span>
                      </div>
                      <div className="font-medium mt-0.5" style={{ color: "#A8190F" }}>
                        Flagged Suspicious:{" "}
                        <span className="font-mono font-semibold">
                          {payload[1]?.value?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2E7D52"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
            <Area
              type="monotone"
              dataKey="flagged_count"
              stroke="#A8190F"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFlagged)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default VolumeOverTimeChart;
