import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "forest" | "highlight";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, style, ...props }, ref) => {
    const variantInlineStyles: Record<string, React.CSSProperties> = {
      default: {
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(30,77,53,0.04), 0 1px 2px rgba(30,77,53,0.02)",
      },
      subtle: {
        background: "var(--color-bg-soft)",
        border: "1px solid var(--color-border-soft)",
      },
      forest: {
        background: "var(--color-accent)",
        border: "1px solid rgba(168,213,181,0.20)",
        color: "#FAF7F0",
      },
      highlight: {
        background: "var(--color-bg-card)",
        border: "2px solid var(--color-accent-2)",
        boxShadow: "0 0 0 3px rgba(46,125,82,0.10)",
      },
    };

    return (
      <div
        ref={ref}
        className={cn("rounded-2xl transition-all duration-200", className)}
        style={{ ...variantInlineStyles[variant], ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  style,
  ...props
}) => (
  <div
    className={cn("px-5 py-4 flex items-center justify-between gap-4", className)}
    style={{ borderBottom: "1px solid var(--color-border)", ...style }}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  style,
  ...props
}) => (
  <h3
    className={cn("text-sm font-semibold tracking-tight", className)}
    style={{ color: "var(--color-ink)", ...style }}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  style,
  ...props
}) => (
  <p
    className={cn("text-xs mt-0.5", className)}
    style={{ color: "var(--color-ink-2)", ...style }}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn("p-5", className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  style,
  ...props
}) => (
  <div
    className={cn("px-5 py-4 rounded-b-2xl flex items-center justify-between", className)}
    style={{
      background: "var(--color-bg-soft)",
      borderTop: "1px solid var(--color-border)",
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);
