import React from "react";
import { ConfusionMatrix } from "../../types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { formatNumber } from "../../lib/utils";
import { Info } from "lucide-react";

interface ConfusionMatrixCardProps {
  matrix: ConfusionMatrix;
}

export const ConfusionMatrixCard: React.FC<ConfusionMatrixCardProps> = ({ matrix }) => {
  const total =
    matrix.true_positives +
    matrix.false_positives +
    matrix.true_negatives +
    matrix.false_negatives;

  const precision = (
    (matrix.true_positives / (matrix.true_positives + matrix.false_positives || 1)) *
    100
  ).toFixed(1);

  const recall = (
    (matrix.true_positives / (matrix.true_positives + matrix.false_negatives || 1)) *
    100
  ).toFixed(1);

  const fpr = (
    (matrix.false_positives / (matrix.false_positives + matrix.true_negatives || 1)) *
    100
  ).toFixed(2);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Confusion Matrix & Classification Truth</CardTitle>
          <CardDescription>
            Sample size: {formatNumber(total)} transactions evaluated
          </CardDescription>
        </div>
        <span
          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
          style={{
            background: "var(--color-bg-soft)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink-2)",
          }}
        >
          Binary Ground Truth
        </span>
      </CardHeader>

      <CardContent className="space-y-5 flex-1">
        {/* Matrix Grid */}
        <div className="grid grid-cols-2 gap-3 text-center">
          {/* True Positive */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "var(--color-accent-muted)",
              border: "1px solid rgba(46,125,82,0.25)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: "var(--color-accent)" }}
            >
              True Positive (TP)
            </span>
            <div
              className="text-2xl font-extrabold font-mono mt-1"
              style={{ color: "var(--color-accent)" }}
            >
              {formatNumber(matrix.true_positives)}
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: "var(--color-accent-2)" }}>
              Actual Fraud Correctly Blocked
            </span>
          </div>

          {/* False Positive */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "var(--color-gold-muted)",
              border: "1px solid rgba(184,134,11,0.25)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: "var(--color-gold)" }}
            >
              False Positive (FP)
            </span>
            <div
              className="text-2xl font-extrabold font-mono mt-1"
              style={{ color: "var(--color-gold)" }}
            >
              {formatNumber(matrix.false_positives)}
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: "var(--color-ink-2)" }}>
              Legitimate Flagged
            </span>
          </div>

          {/* False Negative */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(168,25,15,0.06)",
              border: "1px solid rgba(168,25,15,0.25)",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
              False Negative (FN)
            </span>
            <div className="text-2xl font-extrabold font-mono text-red-700 mt-1">
              {formatNumber(matrix.false_negatives)}
            </div>
            <span className="text-[11px] text-red-600 mt-0.5 block">
              Fraud Missed by Model
            </span>
          </div>

          {/* True Negative */}
          <div
            className="p-4 rounded-xl"
            style={{
              background: "var(--color-bg-soft)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: "var(--color-ink-2)" }}
            >
              True Negative (TN)
            </span>
            <div
              className="text-2xl font-extrabold font-mono mt-1"
              style={{ color: "var(--color-ink)" }}
            >
              {formatNumber(matrix.true_negatives)}
            </div>
            <span className="text-[11px] mt-0.5 block" style={{ color: "var(--color-ink-2)" }}>
              Legitimate Correctly Allowed
            </span>
          </div>
        </div>

        {/* Statistical Summary */}
        <div
          className="pt-4 grid grid-cols-3 gap-2 text-center text-xs"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div>
            <span className="block" style={{ color: "var(--color-ink-3)" }}>
              Precision
            </span>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--color-accent-2)" }}>
              {precision}%
            </span>
          </div>
          <div>
            <span className="block" style={{ color: "var(--color-ink-3)" }}>
              Recall
            </span>
            <span className="font-mono font-bold text-sm" style={{ color: "var(--color-gold)" }}>
              {recall}%
            </span>
          </div>
          <div>
            <span className="block" style={{ color: "var(--color-ink-3)" }}>
              FPR
            </span>
            <span className="font-mono font-bold text-sm" style={{ color: "#A8190F" }}>
              {fpr}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfusionMatrixCard;
