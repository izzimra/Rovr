/**
 * AppShell
 *
 * Root chrome wrapping every authenticated route: persistent SideNav on
 * the left, sticky TopBar on top, and a main scroll region for the route
 * content.
 *
 * Server component. The interactive leaves (SideNav link state, TopBar
 * controls) are each `"use client"` and hydrate independently.
 */

import type { ReactNode } from "react";

import { SideNav } from "@/components/shell/SideNav";
import { TopBar } from "@/components/shell/TopBar";

export function AppShell({ children }: { children: ReactNode }) {
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
