/**
 * Route analytics store.
 *
 * Holds the current optimized route, the derived RouteInsight narrative,
 * and the baseline duration used to compute "travel saved". The Maps
 * teammate writes here; the AI + KPI stores read from it.
 */

import { create } from "zustand";
import type { OptimizedRoute, RouteInsight } from "../types/route";

export interface RouteStoreState {
  route: OptimizedRoute | null;
  insight: RouteInsight | null;
  /** Duration of the naive priority-only sequence, in minutes. */
  baselineDurationMinutes: number | null;
  isOptimizing: boolean;
  error: string | null;

  setRoute: (route: OptimizedRoute | null) => void;
  setInsight: (insight: RouteInsight | null) => void;
  setBaselineDuration: (minutes: number | null) => void;
  setOptimizing: (flag: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL: Pick<
  RouteStoreState,
  "route" | "insight" | "baselineDurationMinutes" | "isOptimizing" | "error"
> = {
  route: null,
  insight: null,
  baselineDurationMinutes: null,
  isOptimizing: false,
  error: null,
};

export const useRouteStore = create<RouteStoreState>()((set) => ({
  ...INITIAL,

  setRoute: (route) => set({ route }),
  setInsight: (insight) => set({ insight }),
  setBaselineDuration: (baselineDurationMinutes) => set({ baselineDurationMinutes }),
  setOptimizing: (isOptimizing) => set({ isOptimizing }),
  setError: (error) => set({ error }),

  reset: () => set({ ...INITIAL }),
}));
