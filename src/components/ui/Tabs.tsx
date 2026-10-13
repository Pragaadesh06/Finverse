import React from "react";
import { cn } from "../../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={cn("flex items-center gap-1 p-1 rounded-xl transition-all", className)}
      style={{
        background: "var(--color-bg-soft)",
        border: "1px solid var(--color-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none"
            style={{
              background: isActive ? "var(--color-bg-card)" : "transparent",
              color: isActive ? "var(--color-ink)" : "var(--color-ink-2)",
              border: isActive ? "1px solid var(--color-border)" : "1px solid transparent",
              boxShadow: isActive ? "0 1px 3px rgba(30,77,53,0.06)" : "none",
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold"
                style={{
                  background: isActive ? "var(--color-accent-muted)" : "var(--color-bg-subtle)",
                  color: isActive ? "var(--color-accent-2)" : "var(--color-ink-3)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
