/**
 * KPI store.
 *
 * Mirror of the KPI tiles at the top of the Dashboard_Layout. Downstream
 * of the customer + route stores — the UI can either pull from here
 * directly, or compose its own selector over those stores and call
 * `setKpis` once per recomputation.
 */

import { create } from "zustand";
import type { KPIData } from "../types/analytics";

export interface KPIStoreState {
  kpis: KPIData | null;
  isLoading: boolean;
  error: string | null;

  setKpis: (kpis: KPIData | null) => void;
  setLoading: (flag: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL: Pick<KPIStoreState, "kpis" | "isLoading" | "error"> = {
  kpis: null,
  isLoading: false,
  error: null,
};

export const useKPIStore = create<KPIStoreState>()((set) => ({
  ...INITIAL,

  setKpis: (kpis) => set({ kpis }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  reset: () => set({ ...INITIAL }),
}));
