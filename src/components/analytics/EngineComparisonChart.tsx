import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { ModelEvaluationMetrics } from "../../types";

interface EngineComparisonChartProps {
  comparison: ModelEvaluationMetrics["engine_comparison"];
}

export const EngineComparisonChart: React.FC<EngineComparisonChartProps> = ({ comparison }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Rules-Only vs Hybrid Finverse AI Engine</CardTitle>
          <CardDescription>
            Performance lift comparison across standard financial crime benchmarks
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparison}
            margin={{ top: 20, right: 20, left: -15, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="metric"
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
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
                      <div className="font-bold mb-1.5" style={{ color: "var(--color-ink)" }}>
                        {label}
                      </div>
                      <div style={{ color: "var(--color-ink-2)" }}>
                        Legacy Rules-Only:{" "}
                        <span className="font-mono font-semibold" style={{ color: "var(--color-ink)" }}>
                          {payload[0]?.value}
                        </span>
                      </div>
                      <div className="mt-0.5" style={{ color: "var(--color-accent-2)" }}>
                        Finverse AI Engine:{" "}
                        <span className="font-mono font-bold" style={{ color: "var(--color-gold)" }}>
                          {payload[1]?.value}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
            />
            <Bar
              name="Legacy Rules-Only"
              dataKey="rules_only"
              fill="var(--color-border)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              name="Finverse AI Engine"
              dataKey="combined_ai_engine"
              fill="var(--color-accent-2)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default EngineComparisonChart;
