import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { ModelEvaluationMetrics } from "../../types";

interface ThresholdAnalysisChartProps {
  data: ModelEvaluationMetrics["score_threshold_analysis"];
}

export const ThresholdAnalysisChart: React.FC<ThresholdAnalysisChartProps> = ({ data }) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Precision vs Recall Tradeoff Curve</CardTitle>
          <CardDescription>
            Performance sensitivity across decision score thresholds
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="threshold"
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tickFormatter={(v) => `≥ ${v}`}
            />
            <YAxis
              stroke="var(--color-ink-3)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              domain={[60, 100]}
              tickFormatter={(v) => `${v}%`}
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
                        Score Cutoff: ≥ {label}
                      </div>
                      <div className="font-semibold" style={{ color: "var(--color-accent-2)" }}>
                        Precision: {payload[0]?.value}%
                      </div>
                      <div className="font-semibold mt-0.5" style={{ color: "var(--color-gold)" }}>
                        Recall: {payload[1]?.value}%
                      </div>
                      <div className="font-semibold mt-0.5" style={{ color: "#A8190F" }}>
                        False Positive Rate: {payload[2]?.value}%
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }} />
            <Line
              type="monotone"
              dataKey="precision"
              name="Precision (%)"
              stroke="#2E7D52"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="recall"
              name="Recall (%)"
              stroke="#B8860B"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="fpr"
              name="FPR (%)"
              stroke="#A8190F"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ThresholdAnalysisChart;
