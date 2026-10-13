import React from "react";
import { FinverseLogo } from "./FinverseLogo";

export interface FinverseWordmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  showVersion?: boolean;
  version?: string;
  className?: string;
  align?: "left" | "center";
}

export const FinverseWordmark: React.FC<FinverseWordmarkProps> = ({
  size = "md",
  showTagline = true,
  showVersion = false,
  version = "v3.4",
  className = "",
  align = "left",
}) => {
  const logoSizes = {
    sm: 28,
    md: 36,
    lg: 44,
    xl: 56,
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const taglineSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-xs",
  };

  return (
    <div
      className={`inline-flex ${align === "center" ? "flex-col items-center text-center" : "items-center gap-3"} ${className}`}
    >
      <FinverseLogo size={logoSizes[size]} />
      <div className={align === "center" ? "mt-2" : "min-w-0"}>
        <div className="flex items-center gap-2 justify-center">
          <span
            className={`font-bold tracking-tight ${titleSizes[size]}`}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--color-ink)",
              letterSpacing: "-0.015em",
            }}
          >
            Finverse
          </span>
          {showVersion && (
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                background: "var(--color-gold-muted)",
                color: "var(--color-gold)",
                border: "1px solid rgba(184,134,11,0.25)",
                letterSpacing: "0.05em",
              }}
            >
              {version}
            </span>
          )}
        </div>
        {showTagline && (
          <p
            className={`font-medium uppercase tracking-widest mt-0.5 ${taglineSizes[size]}`}
            style={{ color: "var(--color-ink-3)", letterSpacing: "0.08em" }}
          >
            See the Pattern. Understand the Risk.
          </p>
        )}
      </div>
    </div>
  );
};

export default FinverseWordmark;
