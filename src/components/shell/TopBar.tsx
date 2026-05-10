"use client";

/**
 * TopBar
 *
 * Sticky app-wide header. Route-agnostic global search, notification + AI
 * quick-access buttons, and a profile avatar chip.
 */

import { Bell, Search, Sparkles, User } from "lucide-react";

export function TopBar() {
  return (
    <header
      className="
        sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-6
        border-b border-outline-variant/10 bg-surface-container-low/80 px-6
        backdrop-blur-xl
      "
    >
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search customers, territories, metrics..."
          aria-label="Search"
          className="
            w-full rounded-full border border-outline-variant/20
            bg-surface-container-lowest py-2 pl-10 pr-4
            text-sm text-on-surface placeholder:text-on-surface-variant/50
            transition-colors duration-200
            focus:border-primary/40 focus:outline-none
            focus:ring-1 focus:ring-primary/20
          "
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <IconButton ariaLabel="Notifications">
          <Bell className="h-5 w-5" strokeWidth={2} />
        </IconButton>
        <IconButton ariaLabel="AI quick actions">
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </IconButton>

        {/* Avatar chip — neutral placeholder, no remote image fetch. */}
        <button
          type="button"
          aria-label="Account"
          className="
            ml-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full
            border border-outline-variant/30 bg-secondary-container/40
            text-secondary transition-colors
            hover:border-primary/40 hover:text-primary
          "
        >
          <User className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function IconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="
        flex h-9 w-9 cursor-pointer items-center justify-center rounded-full
        text-on-surface-variant transition-colors duration-200
        hover:bg-surface-container-highest/60 hover:text-primary
      "
    >
      {children}
    </button>
  );
}

export default TopBar;
