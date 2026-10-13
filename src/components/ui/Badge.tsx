import React from "react";
import { cn, getRiskBadgeClass, getActionBadgeClass, getCaseStatusBadgeClass } from "../../lib/utils";
import { RiskLevel, RecommendedAction } from "../../types";

interface RiskBadgeProps {
  level: RiskLevel | null | undefined;
  score?: number | null;
  className?: string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  className,
  showDot = true,
}) => {
  const badgeClass = getRiskBadgeClass(level);
  const label = level ? level.toUpperCase() : "UNRATED";

  const dotColors: Record<RiskLevel, string> = {
    low: "bg-emerald-500",
    medium: "bg-amber-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  return (
    <span className={cn(badgeClass, className)}>
      {showDot && level && (
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-subtle", dotColors[level])} />
      )}
      <span>{label}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono font-semibold ml-0.5 opacity-90">({score})</span>
      )}
    </span>
  );
};

interface ActionBadgeProps {
  action: RecommendedAction | null | undefined;
  className?: string;
}

export const ActionBadge: React.FC<ActionBadgeProps> = ({ action, className }) => {
  const badgeClass = getActionBadgeClass(action);
  const labels: Record<RecommendedAction, string> = {
    allow: "Allow",
    step_up_verification: "Step-Up 2FA",
    manual_review: "Manual Review",
    hold_for_review: "Hold for AML",
  };

  return (
    <span className={cn(badgeClass, className)}>
      {action ? labels[action] || action : "Pending"}
    </span>
  );
};

interface CaseStatusBadgeProps {
  status: string;
  className?: string;
}

export const CaseStatusBadge: React.FC<CaseStatusBadgeProps> = ({ status, className }) => {
  const badgeClass = getCaseStatusBadgeClass(status);
  const formatted = status.replace("_", " ").toUpperCase();

  return (
    <span className={cn(badgeClass, className)}>
      {formatted}
    </span>
  );
};

export interface BadgeProps {
  variant?: "low" | "medium" | "high" | "critical" | "default" | "secondary";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "default", children, className }) => {
  const variantClasses: Record<string, string> = {
    low: "bg-emerald-950/50 text-emerald-300 border border-emerald-800/40",
    medium: "bg-amber-950/50 text-amber-300 border border-amber-800/40",
    high: "bg-orange-950/50 text-orange-300 border border-orange-800/40",
    critical: "bg-red-950/50 text-red-300 border border-red-800/40",
    default: "bg-neutral-800 text-neutral-200 border border-neutral-700",
    secondary: "bg-neutral-900 text-neutral-400 border border-neutral-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase",
        variantClasses[variant] || variantClasses.default,
        className
      )}
    >
      {children}
    </span>
  );
};

