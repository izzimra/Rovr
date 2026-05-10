/**
 * Customer intelligence store.
 *
 * Owns the current set of Customer_Records, their AI-ranked derivatives,
 * and the user-visible load/error state used by the ranked list. The
 * store is intentionally framework-agnostic: server code pushes updates
 * via the `setCustomers` / `setRankedCustomers` actions and the UI
 * subscribes for re-renders.
 */

import { create } from "zustand";
import type { Customer, RankedCustomer } from "../types/customer";
import { rankCustomers } from "../lib/scoring/rankCustomers";

export interface CustomerStoreState {
  customers: Customer[];
  ranked: RankedCustomer[];
  isLoading: boolean;
  error: string | null;
  /** True while the rep is actively browsing Demo_Mode data. */
  demoMode: boolean;

  setCustomers: (customers: Customer[]) => void;
  setRankedCustomers: (ranked: RankedCustomer[]) => void;
  rerank: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setDemoMode: (enabled: boolean) => void;
  reset: () => void;
}

const INITIAL: Pick<
  CustomerStoreState,
  "customers" | "ranked" | "isLoading" | "error" | "demoMode"
> = {
  customers: [],
  ranked: [],
  isLoading: false,
  error: null,
  demoMode: false,
};

export const useCustomerStore = create<CustomerStoreState>()((set, get) => ({
  ...INITIAL,

  setCustomers: (customers) => {
    const ranked = rankCustomers(customers);
    set({ customers, ranked });
  },

  setRankedCustomers: (ranked) => set({ ranked }),

  rerank: () => {
    const { customers } = get();
    set({ ranked: rankCustomers(customers) });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDemoMode: (demoMode) => set({ demoMode }),

  reset: () => set({ ...INITIAL }),
}));
