"use client";

/**
 * TopBar
 *
 * Sticky app-wide header. Global keyword search, notifications dropdown,
 * "New Optimization" quick-action, and an account chip that triggers the
 * demo-mode boot flow.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, Sparkles, User } from "lucide-react";

import { bootstrapDashboard } from "@/lib/orchestration";
import { useCustomerStore } from "@/store/customer-store";

export function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const ranked = useCustomerStore((s) => s.ranked);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    // Route-aware search: matching customer names jump to /customers, a
    // literal "territories" jumps to /territories, etc.
    if (q.includes("territor")) router.push("/territories");
    else if (q.includes("analyt")) router.push("/analytics");
    else if (q.includes("setting")) router.push("/settings");
    else router.push("/customers");
  };

  const handleOptimize = () => {
    void bootstrapDashboard({ mode: "demo" });
    router.push("/");
  };

  const notifications = buildNotifications(ranked.length);

  return (
    <header
      className="
        sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-6
        border-b border-outline-variant/10 bg-surface-container-low/80 px-6
        backdrop-blur-xl
      "
    >
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
          strokeWidth={2}
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <IconButton
            ariaLabel="Notifications"
            onClick={() => setNotificationsOpen((v) => !v)}
            badge={notifications.length > 0}
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
          </IconButton>
          {notificationsOpen ? (
            <Dropdown onClose={() => setNotificationsOpen(false)}>
              <div className="border-b border-white/5 px-4 py-3">
                <div className="text-sm font-semibold text-on-surface">
                  Notifications
                </div>
                <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.14em] text-on-surface-variant">
                  {notifications.length} new
                </div>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <li
                    key={i}
                    className="border-b border-white/5 px-4 py-3 text-sm text-on-surface-variant last:border-b-0 hover:bg-white/5"
                  >
                    <div className="font-medium text-on-surface">{n.title}</div>
                    <div className="mt-0.5 text-xs">{n.body}</div>
                  </li>
                ))}
              </ul>
            </Dropdown>
          ) : null}
        </div>

        <IconButton ariaLabel="New optimization" onClick={handleOptimize}>
          <Sparkles className="h-5 w-5" strokeWidth={2} />
        </IconButton>

        <div className="relative">
          <button
            type="button"
            aria-label="Account"
            onClick={() => setAccountOpen((v) => !v)}
            className="
              ml-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full
              border border-outline-variant/30 bg-secondary-container/40
              text-secondary transition-colors
              hover:border-primary/40 hover:text-primary
            "
          >
            <User className="h-4 w-4" strokeWidth={2} />
          </button>
          {accountOpen ? (
            <Dropdown onClose={() => setAccountOpen(false)}>
              <div className="border-b border-white/5 px-4 py-3">
                <div className="text-sm font-semibold text-on-surface">
                  Alex Tan
                </div>
                <div className="text-xs text-on-surface-variant">
                  Field Sales · Enterprise tier
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="block w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="block w-full px-4 py-3 text-left text-sm text-on-surface hover:bg-white/5"
              >
                Sign out
              </button>
            </Dropdown>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  ariaLabel,
  onClick,
  badge,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick?: () => void;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="
        relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full
        text-on-surface-variant transition-colors duration-200
        hover:bg-surface-container-highest/60 hover:text-primary
      "
    >
      {children}
      {badge ? (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}

function Dropdown({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      {/* Click-outside catcher */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-white/10 bg-surface-container-low/95 shadow-2xl backdrop-blur-xl">
        {children}
      </div>
    </>
  );
}

function buildNotifications(accountCount: number) {
  if (accountCount === 0) {
    return [
      {
        title: "Territory empty",
        body: "Activate Demo Mode or upload a CSV to get started.",
      },
    ];
  }
  return [
    {
      title: "AI prioritisation complete",
      body: `Rovr has ranked ${accountCount} accounts for today's route.`,
    },
    {
      title: "Route optimisation ready",
      body: "A new optimized visit sequence is available on the dashboard.",
    },
    {
      title: "Renewal risk detected",
      body: "One or more accounts have exceeded the 30-day freshness window.",
    },
  ];
}

export default TopBar;
