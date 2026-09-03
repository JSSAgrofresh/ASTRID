import type { HTMLAttributes } from "react";

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-[var(--card-shadow)]",
        interactive &&
          "transition-colors duration-200 hover:border-border-strong hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
