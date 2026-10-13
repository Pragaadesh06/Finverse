import React from "react";
import { RiskAssessment } from "../../types";
import { ShieldAlert, Info } from "lucide-react";
import { RiskBadge } from "../ui/Badge";
import { cn } from "../../lib/utils";

interface RiskExplanationPanelProps {
  assessment: RiskAssessment;
}

export const RiskExplanationPanel: React.FC<RiskExplanationPanelProps> = ({ assessment }) => {
  return (
    <div
      className="rounded-2xl p-6 space-y-6 transition-all"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(168, 25, 15, 0.08)",
                color: "#A8190F",
                border: "1px solid rgba(168, 25, 15, 0.20)",
              }}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h3
              className="text-base font-bold tracking-tight font-sans"
              style={{ color: "var(--color-ink)", fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Attribution & Risk Analysis
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--color-ink-2)" }}>
            Explainable AI attribution, topological heuristic indicators, and statistical z-score evidence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
              Attribution Score
            </div>
            <div className="text-lg font-bold font-mono" style={{ color: "var(--color-ink)" }}>
              {assessment.risk_score} <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>/ 100</span>
            </div>
          </div>
          <RiskBadge level={assessment.risk_level} score={assessment.risk_score} />
        </div>
      </div>

      {/* Model Confidence Metadata Pill */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl text-xs"
        style={{
          background: "var(--color-bg-soft)",
          border: "1px solid var(--color-border)",
          color: "var(--color-ink-2)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
            Scoring Engine:
          </span>
          <code
            className="font-mono text-[11px] px-2 py-0.5 rounded font-semibold"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-accent-2)",
            }}
          >
            {assessment.model_version || "Finverse-XGBoost-GNN-v3.4.1"}
          </code>
        </div>
        {assessment.confidence && (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
              Confidence Metric:
            </span>
            <span
              className="font-mono font-bold px-2 py-0.5 rounded text-xs"
              style={{
                background: "var(--color-accent-muted)",
                color: "var(--color-accent)",
                border: "1px solid rgba(46,125,82,0.25)",
              }}
            >
              {(assessment.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Risk Factors List */}
      <div className="space-y-4">
        <h4
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-ink-3)" }}
        >
          Identified Risk Factors & Mathematical Evidence
        </h4>

        <div className="grid grid-cols-1 gap-3.5">
          {assessment.risk_factors.map((factor, idx) => (
            <div
              key={factor.code || idx}
              className="p-4 rounded-xl border transition-all"
              style={{
                background:
                  factor.severity === "critical"
                    ? "rgba(168, 25, 15, 0.05)"
                    : factor.severity === "high"
                    ? "rgba(212, 160, 23, 0.08)"
                    : "var(--color-bg-soft)",
                borderColor:
                  factor.severity === "critical"
                    ? "rgba(168, 25, 15, 0.25)"
                    : factor.severity === "high"
                    ? "rgba(212, 160, 23, 0.25)"
                    : "var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      factor.severity === "critical"
                        ? "bg-red-500"
                        : factor.severity === "high"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                  />
                  <h5 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
                    {factor.label}
                  </h5>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--color-bg-card)",
                      color: "var(--color-ink-3)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {factor.code}
                  </span>
                </div>

                {factor.contribution !== null && factor.contribution !== undefined && (
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded shadow-sm"
                    style={{
                      background: "var(--color-bg-card)",
                      border: "1px solid rgba(168,25,15,0.25)",
                      color: "#A8190F",
                    }}
                  >
                    +{factor.contribution} pts
                  </span>
                )}
              </div>

              <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
                {factor.description}
              </p>

              {factor.evidence && (
                <div
                  className="mt-3 pt-2.5 flex items-start gap-2 text-xs"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-gold)" }} />
                  <div className="font-mono text-[11px]" style={{ color: "var(--color-ink-2)" }}>
                    <strong className="font-semibold" style={{ color: "var(--color-ink)" }}>
                      Supporting Evidence:
                    </strong>{" "}
                    {factor.evidence}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskExplanationPanel;
