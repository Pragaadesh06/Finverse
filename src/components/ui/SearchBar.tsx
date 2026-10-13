import React from "react";
import { cn } from "../../lib/utils";
import { Search, X } from "lucide-react";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  shortcut?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeValue,
  onClear,
  placeholder = "Search transactions, accounts, cases…",
  className,
  shortcut,
  ...props
}) => {
  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Search
        className="absolute left-3.5 w-3.5 h-3.5 pointer-events-none"
        style={{ color: "var(--color-ink-3)" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm rounded-xl transition-all duration-150"
        style={{
          background: "var(--color-bg-card)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(30,77,53,0.04)",
          fontFamily: "inherit",
        }}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChangeValue("");
            if (onClear) onClear();
          }}
          className="absolute right-3 p-1 rounded-md transition-colors"
          style={{ color: "var(--color-ink-3)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : shortcut ? (
        <span
          className="absolute right-3 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded"
          style={{
            color: "var(--color-ink-3)",
            background: "var(--color-bg-soft)",
            border: "1px solid var(--color-border)",
          }}
        >
          {shortcut}
        </span>
      ) : null}
    </div>
  );
};
