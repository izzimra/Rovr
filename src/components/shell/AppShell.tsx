"use client";

/**
 * AppShell
 *
 * Root chrome wrapping every authenticated route: persistent SideNav on
 * the left, sticky TopBar on top, and a main scroll region for the route
 * content.
 *
 * Boots the dashboard orchestration pipeline exactly once per hard load,
 * so every route (/, /territories, /customers, /analytics, /settings)
 * sees the same populated Zustand stores — no empty screens after a
 * client-side navigation from a non-dashboard starting point.
 */

import type { ReactNode } from "react";

import { SideNav } from "@/components/shell/SideNav";
import { TopBar } from "@/components/shell/TopBar";
import { useDashboardBoot } from "@/lib/orchestration";

export function AppShell({ children }: { children: ReactNode }) {
  useDashboardBoot({ mode: "auto" });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
