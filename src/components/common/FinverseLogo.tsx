import React from "react";

export interface FinverseLogoProps {
  size?: number | string;
  className?: string;
  variant?: "full" | "monochrome" | "gold";
  showShield?: boolean;
}

/**
 * FinverseLogo
 * An original geometric financial network / abstract 'F' monogram.
 * Composed of interconnected precision transaction vectors and nodes
 * enclosed in a classic seal framing.
 */
export const FinverseLogo: React.FC<FinverseLogoProps> = ({
  size = 36,
  className = "",
  variant = "full",
}) => {
  const isMono = variant === "monochrome";
  const isGold = variant === "gold";

  const primaryStroke = isMono
    ? "currentColor"
    : isGold
    ? "#D4A017"
    : "#2E7D52";

  const accentColor = isMono
    ? "currentColor"
    : isGold
    ? "#F5D061"
    : "#D4A017";

  const shieldBg = isMono
    ? "transparent"
    : "linear-gradient(145deg, #163826 0%, #1E4D35 60%, #122B1E 100%)";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl flex-shrink-0 transition-transform ${className}`}
      style={{
        width: typeof size === "number" ? `${size}px` : size,
        height: typeof size === "number" ? `${size}px` : size,
        background: isMono ? "transparent" : shieldBg,
        boxShadow: isMono
          ? "none"
          : "0 2px 8px rgba(22, 56, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        border: isMono ? "none" : "1px solid rgba(168, 213, 181, 0.25)",
      }}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "70%", height: "70%" }}
        role="img"
        aria-label="Finverse Brand Logo"
      >
        {/* Outer subtle geometric frame - diamond-cut shield */}
        <path
          d="M20 3L35 8V18C35 27.5 28.5 35.2 20 38C11.5 35.2 5 27.5 5 18V8L20 3Z"
          stroke={primaryStroke}
          strokeWidth="1.2"
          strokeOpacity={isMono ? "0.6" : "0.5"}
          fill="none"
        />

        {/* Abstract Architectural 'F' Network Graph */}
        {/* Main Vertical Spine with node connectors */}
        <line
          x1="14"
          y1="11"
          x2="14"
          y2="29"
          stroke={primaryStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Top Crossbar with endpoint node */}
        <path
          d="M14 13H27"
          stroke={primaryStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Middle Crossbar with gold focal node */}
        <path
          d="M14 20H23"
          stroke={primaryStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Diagonal Risk Intelligence Vector (connecting nodes) */}
        <path
          d="M23 20L27 13"
          stroke={accentColor}
          strokeWidth="1.8"
          strokeDasharray="2 2"
          strokeLinecap="round"
        />

        {/* Precision Network Nodes */}
        {/* Node 1: Top-left anchor */}
        <circle cx="14" cy="13" r="2.2" fill={accentColor} />

        {/* Node 2: Top-right terminal */}
        <circle cx="27" cy="13" r="2.2" fill={primaryStroke} stroke={accentColor} strokeWidth="1" />

        {/* Node 3: Mid-left junction */}
        <circle cx="14" cy="20" r="2" fill={accentColor} />

        {/* Node 4: Mid-right gold beacon */}
        <circle cx="23" cy="20" r="2.2" fill={accentColor} />

        {/* Node 5: Base anchor */}
        <circle cx="14" cy="29" r="2" fill={primaryStroke} />

        {/* Micro-spark / gold diamond at center convergence */}
        <path
          d="M20 25L21.5 27L20 29L18.5 27L20 25Z"
          fill={accentColor}
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

export default FinverseLogo;
