"use client";

/**
 * useDashboardBoot
 *
 * Client hook that kicks off `bootstrapDashboard()` exactly once per
 * mount. Guarded against React 19's strict-mode double effects and
 * against remounts so the /api/* pipeline doesn't fire twice.
 *
 * Mount this inside a single top-level client component on the dashboard
 * route (see `src/components/DashboardHydrator.tsx`).
 */

import { useEffect, useRef } from "react";

import { bootstrapDashboard, type BootstrapOptions } from "./dashboardFlow";

export function useDashboardBoot(options: BootstrapOptions = {}): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    void bootstrapDashboard({ ...options, signal: controller.signal });

    return () => controller.abort();
    // We intentionally run this once per mount. Changing `options` after
    // mount would not meaningfully re-seed the dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
