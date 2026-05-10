/**
 * shadcn/ui Badge primitive (local copy).
 *
 * Mirrors the official shadcn/ui `badge` component API so that once shadcn
 * is generated into this project (via `npx shadcn@latest add badge`), this
 * file can be replaced without touching consumers.
 *
 * Docs: https://ui.shadcn.com/docs/components/badge
 */

import * as React from "react";

function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(" ");
}

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-900",
  secondary: "bg-zinc-800 text-zinc-100",
  outline: "border border-white/10 text-zinc-200",
  destructive: "bg-red-500/10 text-red-400",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] leading-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
