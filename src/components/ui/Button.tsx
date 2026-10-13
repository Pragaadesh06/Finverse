import React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantInlineStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "var(--color-accent)",
    color: "#FAF7F0",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--color-bg-soft)",
    color: "var(--color-ink)",
    border: "1px solid var(--color-border)",
  },
  outline: {
    background: "var(--color-bg-card)",
    color: "var(--color-ink)",
    border: "1px solid var(--color-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-ink-2)",
    border: "1px solid transparent",
  },
  danger: {
    background: "#A8190F",
    color: "#FAF7F0",
    border: "1px solid transparent",
  },
  gold: {
    background: "var(--color-gold)",
    color: "#FAF7F0",
    border: "1px solid transparent",
  },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.99] hover:-translate-y-px";

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1.5 gap-1.5",
      sm: "text-xs px-3 py-2 gap-2",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-sm px-5 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], className)}
        style={{ ...variantInlineStyles[variant], ...style }}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
