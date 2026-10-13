import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { DashboardSummary } from "../../types";

interface DecisionsChartProps {
  decisions: DashboardSummary["decisions_breakdown"];
}

const colorMap: Record<string, string> = {
  allow: "#2E7D52",
  step_up_verification: "#B8860B",
  manual_review: "#D48B17",
  hold_for_review: "#A8190F",
};

export const DecisionsChart: React.FC<DecisionsChartProps> = ({ decisions }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Recommended Interventions</CardTitle>
          <CardDescription>
            Autonomous orchestration decisions breakdown
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 min-h-[220px]">
        <div className="w-full sm:w-1/2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={decisions}
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="count"
              >
                {decisions.map((entry, index) => (
                  <Cell
                    key={`slice-${index}`}
                    fill={colorMap[entry.action] || entry.color}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className="rounded-xl p-2.5 shadow-lg text-xs"
                        style={{
                          background: "var(--color-bg-card)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-ink)",
                        }}
                      >
                        <div className="font-bold" style={{ color: "var(--color-ink)" }}>
                          {data.label}
                        </div>
                        <div className="mt-0.5" style={{ color: "var(--color-ink-2)" }}>
                          Count:{" "}
                          <span className="font-semibold font-mono" style={{ color: "var(--color-ink)" }}>
                            {data.count.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: "var(--color-ink-2)" }}>
                          Share:{" "}
                          <span className="font-semibold font-mono" style={{ color: "var(--color-gold)" }}>
                            {data.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend List */}
        <div className="w-full sm:w-1/2 space-y-2.5 pr-2">
          {decisions.map((item) => {
            const fill = colorMap[item.action] || item.color;
            return (
              <div key={item.action} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fill }}
                  />
                  <span
                    className="font-medium truncate max-w-[120px]"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {item.label}
                  </span>
                </div>
                <div
                  className="font-mono font-semibold"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {item.percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DecisionsChart;
