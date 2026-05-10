/**
 * Settings page.
 *
 * Single-column stack of setting groups. Presentation-only, no wiring;
 * toggles are styled divs, not stateful controls. Drop in real form
 * elements later when the Supabase auth / preferences flow lands.
 */

import {
  Bell,
  CreditCard,
  KeyRound,
  Map,
  ShieldCheck,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shell/PageHeader";

interface SettingGroup {
  title: string;
  description: string;
  icon: LucideIcon;
  rows: Array<{
    label: string;
    description: string;
    value?: string;
    toggle?: boolean;
    enabled?: boolean;
  }>;
}

const GROUPS: readonly SettingGroup[] = [
  {
    title: "Profile",
    description: "Your display name and workspace identity.",
    icon: User,
    rows: [
      { label: "Full name", description: "Used across Rovr surfaces", value: "Alex Tan" },
      { label: "Email", description: "Login + notifications", value: "alex@rovr.ai" },
      { label: "Role", description: "Field Sales Rep", value: "Rep" },
    ],
  },
  {
    title: "Preferences",
    description: "Territory defaults, locale, and currency.",
    icon: Map,
    rows: [
      { label: "Currency", description: "Used in KPI formatting", value: "RM (MYR)" },
      { label: "Locale", description: "Number + date formats", value: "en-MY" },
      { label: "Default origin", description: "Starting point for route optimization", value: "Subang Depot" },
    ],
  },
  {
    title: "Notifications",
    description: "How Rovr reaches you outside the dashboard.",
    icon: Bell,
    rows: [
      { label: "Daily brief", description: "Morning summary at 07:30", toggle: true, enabled: true },
      { label: "Route alerts", description: "Ping me when a route needs re-optimization", toggle: true, enabled: true },
      { label: "Product updates", description: "New features and AI improvements", toggle: true, enabled: false },
    ],
  },
  {
    title: "Security",
    description: "Authentication and session management.",
    icon: ShieldCheck,
    rows: [
      { label: "Two-factor authentication", description: "Required for Enterprise tier", toggle: true, enabled: true },
      { label: "Session length", description: "Auto-logout after inactivity", value: "30 minutes" },
    ],
  },
  {
    title: "API Keys",
    description: "Tokens for backend services.",
    icon: KeyRound,
    rows: [
      { label: "Gemini API key", description: "Server-side only", value: "•••• •••• •••• 4a2c" },
      { label: "Mapbox secret token", description: "Server-side only", value: "•••• •••• •••• 91ef" },
    ],
  },
  {
    title: "Billing",
    description: "Your plan and payment details.",
    icon: CreditCard,
    rows: [
      { label: "Plan", description: "Enterprise Tier · annual", value: "Active" },
      { label: "Renewal date", description: "Auto-renews unless cancelled", value: "Mar 12, 2027" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10">
      <PageHeader
        eyebrow="Enterprise Tier"
        title="Settings"
        description="Configure your workspace, notifications, and security preferences."
      />

      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <SettingGroupCard key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}

function SettingGroupCard({ group }: { group: SettingGroup }) {
  const Icon = group.icon;
  return (
    <section className="rounded-xl border border-white/5 bg-[#121214]/80 backdrop-blur-xl">
      <header className="flex items-center gap-4 border-b border-white/5 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-inset ring-primary/20">
          <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-semibold text-on-surface">{group.title}</h2>
          <p className="text-sm text-on-surface-variant">{group.description}</p>
        </div>
      </header>

      <div className="divide-y divide-white/5">
        {group.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-6 py-4"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-on-surface">
                {row.label}
              </div>
              <div className="text-xs text-on-surface-variant">
                {row.description}
              </div>
            </div>
            {row.toggle ? (
              <Toggle enabled={row.enabled ?? false} />
            ) : (
              <span className="font-mono text-xs tabular-nums text-on-surface-variant">
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Visual-only toggle. Swap for a shadcn Switch once it's added. */
function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      className={`
        relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200
        ${enabled ? "bg-primary" : "bg-surface-container-highest"}
      `}
    >
      <span
        className={`
          absolute top-0.5 h-4 w-4 rounded-full bg-white shadow
          transition-transform duration-200
          ${enabled ? "translate-x-4" : "translate-x-0.5"}
        `}
      />
    </div>
  );
}
