"use client";

/**
 * SideNav
 *
 * Persistent left navigation rail. Five primary routes mirror the
 * reference: Overview, Territories, Customers, Analytics, Settings.
 * The "New Optimization" CTA plus Help / Logout sit in the footer.
 *
 * Uses `next/navigation`'s `usePathname` to highlight the active item
 * so the nav reflects the current route without page-level wiring.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { bootstrapDashboard } from "@/lib/orchestration";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Territories", href: "/territories", icon: Map },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  const handleOptimize = () => {
    void bootstrapDashboard({ mode: "demo" });
  };

  return (
    <aside
      className="
        sticky left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col
        border-r border-outline-variant/10 bg-surface-container-low/80 py-6
        backdrop-blur-xl
      "
      aria-label="Primary navigation"
    >
      {/* Wordmark */}
      <div className="mb-10 px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Rovr AI
        </h1>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/70">
          Enterprise Tier
        </p>
      </div>

      {/* Primary links */}
      <nav className="flex-1 space-y-1 px-4">
        {PRIMARY_NAV.map((item) => (
          <SideNavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </nav>

      {/* Footer: CTA + utility buttons (not navigable routes) */}
      <div className="mt-auto space-y-1 px-4 pt-6">
        <button
          type="button"
          onClick={handleOptimize}
          className="
            mb-6 flex w-full cursor-pointer items-center justify-center gap-2
            rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-3
            font-mono text-xs font-semibold uppercase tracking-[0.08em]
            text-on-primary shadow-lg shadow-primary/20
            transition-transform active:scale-95 hover:shadow-primary/30
          "
          aria-label="Re-run optimization pipeline"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          New Optimization
        </button>

        <SideNavUtilityButton
          icon={HelpCircle}
          label="Help"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(
                "https://github.com/izzimra/Rovr#readme",
                "_blank",
                "noopener,noreferrer",
              );
            }
          }}
        />
        <SideNavUtilityButton
          icon={LogOut}
          label="Sign out"
          onClick={() => {
            // Supabase auth isn't wired into this demo; clear local session
            // state and reload so the dashboard reseeds from scratch.
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        />
      </div>
    </aside>
  );
}

function SideNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        group flex items-center gap-3 rounded-lg px-4 py-3
        font-mono text-xs uppercase tracking-[0.08em]
        transition-colors duration-200
        ${
          active
            ? "border-r-2 border-primary bg-primary/10 text-primary"
            : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
        }
      `}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5"
        strokeWidth={active ? 2.25 : 2}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function SideNavUtilityButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-3
        font-mono text-xs uppercase tracking-[0.08em]
        text-on-surface-variant transition-colors duration-200
        hover:bg-surface-container-highest hover:text-on-surface
      "
    >
      <Icon
        className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5"
        strokeWidth={2}
      />
      <span>{label}</span>
    </button>
  );
}

/**
 * Treat `/` as exact-match and other routes as prefix-match so e.g.
 * `/customers/123` still highlights Customers.
 */
function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default SideNav;
