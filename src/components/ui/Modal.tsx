import React, { useEffect } from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "lg",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity"
        style={{ background: "rgba(30,77,53,0.35)" }}
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn("relative w-full rounded-2xl overflow-hidden z-10 animate-slide-up", widthStyles[maxWidth])}
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 45px -8px rgba(30,77,53,0.18), 0 10px 20px -5px rgba(30,77,53,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between"
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-soft)",
          }}
        >
          <div>
            <h2
              className="text-base font-bold tracking-tight"
              style={{
                color: "var(--color-ink)",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-2)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-ink-2)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
