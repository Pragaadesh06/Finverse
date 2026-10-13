import React from "react";
import { cn } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  isDemo?: boolean;
  className?: string;
  indicatorColor?: "forest" | "critical" | "gold" | "sage" | "emerald" | "blue" | "amber" | "rose" | "purple";
}

const iconColorMap: Record<string, React.CSSProperties> = {
  forest:   { color: "var(--color-accent)", background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.20)" },
  emerald:  { color: "var(--color-accent)", background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.20)" },
  critical: { color: "#A8190F", background: "rgba(168,25,15,0.08)", border: "1px solid rgba(168,25,15,0.20)" },
  rose:     { color: "#A8190F", background: "rgba(168,25,15,0.08)", border: "1px solid rgba(168,25,15,0.20)" },
  gold:     { color: "var(--color-gold)", background: "var(--color-gold-muted)", border: "1px solid rgba(184,134,11,0.20)" },
  amber:    { color: "var(--color-gold)", background: "var(--color-gold-muted)", border: "1px solid rgba(184,134,11,0.20)" },
  sage:     { color: "#5D9B78", background: "rgba(93,155,120,0.10)", border: "1px solid rgba(93,155,120,0.20)" },
  blue:     { color: "var(--color-accent-2)", background: "var(--color-accent-muted)", border: "1px solid rgba(46,125,82,0.20)" },
  purple:   { color: "var(--color-gold)", background: "var(--color-gold-muted)", border: "1px solid rgba(184,134,11,0.20)" },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendDirection = "neutral",
  isDemo = false,
  className,
  indicatorColor = "forest",
}) => {
  const iconStyle = iconColorMap[indicatorColor];

  return (
    <div
      className={cn("rounded-2xl p-5 transition-all duration-200 relative overflow-hidden group", className)}
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
      }}
    >
      {/* Subtle background accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-[0.04] -translate-y-8 translate-x-8"
        style={{ background: iconStyle.color as string }}
      />

      <div className="flex items-start justify-between relative">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-ink-3)" }}
            >
              {title}
            </span>
            {isDemo && (
              <span
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold"
                style={{
                  background: "var(--color-bg-subtle)",
                  color: "var(--color-ink-3)",
                }}
                title="Synthetic Benchmark Data"
              >
                Synthetic
              </span>
            )}
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold tracking-tight mt-1"
            style={{ color: "var(--color-ink)", fontFamily: "'Onest', sans-serif" }}
          >
            {value}
          </div>
        </div>

        <div
          className="p-2.5 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 flex-shrink-0"
          style={iconStyle}
        >
          {icon}
        </div>
      </div>

      {(trend || subtitle) && (
        <div
          className="mt-4 pt-3 flex items-center justify-between text-xs"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {trend && (
            <div className="flex items-center gap-1.5 font-semibold">
              {trendDirection === "up" && (
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--color-accent)" }} />
              )}
              {trendDirection === "down" && (
                <TrendingDown className="w-3.5 h-3.5" style={{ color: "#A8190F" }} />
              )}
              {trendDirection === "neutral" && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-gold)" }}
                />
              )}
              <span
                style={{
                  color:
                    trendDirection === "up"
                      ? "var(--color-accent)"
                      : trendDirection === "down"
                      ? "#A8190F"
                      : "var(--color-ink-2)",
                }}
              >
                {trend}
              </span>
            </div>
          )}
          {subtitle && (
            <span className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
