import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  size = "md",
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{
        color: "var(--color-ink-2)",
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-card)",
      }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      id="theme-toggle-btn"
    >
      {theme === "dark" ? (
        <Sun className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      ) : (
        <Moon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
