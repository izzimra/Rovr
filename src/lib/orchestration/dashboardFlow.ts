/**
 * Dashboard bootstrap flow.
 *
 * Orchestrates the full cold-start pipeline for the Rovr dashboard:
 *
 *   seed customers → rank → optimize route → compute KPIs →
 *   generate insights + daily brief (in parallel) → mark ready
 *
 * Written as a pure async function so it can be triggered from either
 * the first mount of the dashboard (via `useDashboardBoot`) or from an
 * explicit "Activate Demo Mode" button without duplicating logic.
 *
 * Ownership boundary: this file never touches Izzi's presentation
 * components, Atras's Mapbox modules (beyond the already-shipped public
 * API), or Supabase. It reads and writes Zustand store state and calls
 * `/api/*` endpoints via fetch.
 */

import { rankCustomers } from "../scoring/rankCustomers";
import { optimizeRoute, type RouteOrigin } from "../route-optimizer";
import { generateKPIs } from "../analytics/generateKPIs";
import { getMockCustomers } from "../mock/customers";
import { useCustomerStore } from "../../store/customer-store";
import { useRouteStore } from "../../store/route-store";
import { useKPIStore } from "../../store/kpi-store";
import { useAIStore } from "../../store/ai-store";
import type {
  AIInsight,
  AIResponseEnvelope,
  ChatResponse,
  DailyBrief,
} from "../../types/ai";
import type {
  Customer,
  RankedCustomer,
} from "../../types/customer";
import type { OptimizedRoute } from "../../types/route";
import type { KPIData } from "../../types/analytics";

/** Central KL as the default rep origin — same anchor the scoring engine uses. */
export const DEFAULT_ROUTE_ORIGIN: RouteOrigin = {
  lat: 3.139,
  lng: 101.6869,
  label: "KL Central",
};

export interface BootstrapOptions {
  /**
   * Preferred data source. `"auto"` seeds the mock dataset only when the
   * customer store is empty (Demo_Mode fallback). `"demo"` always reseeds
   * from the mock dataset. `"preserve"` keeps whatever is already in the
   * customer store.
   */
  mode?: "auto" | "demo" | "preserve";
  origin?: RouteOrigin;
  maxStops?: number;
  signal?: AbortSignal;
}

/**
 * Run the full dashboard bootstrap pipeline. Safe to call from the
 * browser (uses relative `/api/*` URLs).
 */
export async function bootstrapDashboard(
  options: BootstrapOptions = {},
): Promise<void> {
  const mode = options.mode ?? "auto";
  const origin = options.origin ?? DEFAULT_ROUTE_ORIGIN;
  const maxStops = options.maxStops ?? 10;

  const customerStore = useCustomerStore.getState();
  const routeStore = useRouteStore.getState();
  const kpiStore = useKPIStore.getState();
  const aiStore = useAIStore.getState();

  // ── 1. Seed customers ──────────────────────────────────────────────
  customerStore.setLoading(true);
  customerStore.setError(null);

  const seedCustomers: Customer[] = (() => {
    if (mode === "demo") return getMockCustomers();
    if (mode === "preserve" && customerStore.customers.length > 0) {
      return customerStore.customers;
    }
    return customerStore.customers.length > 0
      ? customerStore.customers
      : getMockCustomers();
  })();

  customerStore.setCustomers(seedCustomers);
  customerStore.setDemoMode(mode !== "preserve");

  // ── 2. AI prioritization (with deterministic fallback baked in) ────
  //
  // Cap `topN` at 3 per boot to stay inside Gemini's 5-req/min free tier.
  // Every customer whose rank <= topN gets a Gemini-authored explanation;
  // the rest keep the deterministic scoring-engine explanation which
  // already reads as production copy.
  let ranked: RankedCustomer[] = rankCustomers(seedCustomers);
  try {
    const res = await fetch("/api/prioritize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customers: seedCustomers, topN: 3 }),
      signal: options.signal,
    });
    if (res.ok) {
      const envelope = (await res.json()) as AIResponseEnvelope<{
        ranked: RankedCustomer[];
      }>;
      if (envelope?.data?.ranked?.length) {
        ranked = envelope.data.ranked;
      }
    }
  } catch {
    // Fall through to the deterministic ranking we already set.
  }

  customerStore.setRankedCustomers(ranked);
  customerStore.setLoading(false);

  // ── 3. Route optimization ──────────────────────────────────────────
  routeStore.setOptimizing(true);
  routeStore.setError(null);

  let optimized: OptimizedRoute | null = null;
  try {
    optimized = await optimizeRoute(ranked, origin, {
      maxStops,
      signal: options.signal,
    });
    routeStore.setRoute(optimized);

    // Baseline duration = same stops in priority order (no nearest-neighbor).
    // Approximate with the optimized total — good enough until the optimizer
    // returns an explicit baseline. See `calculateTravelSavings` usage.
    routeStore.setBaselineDuration(
      Math.round(optimized.totalDurationMinutes * 1.25),
    );
  } catch (err) {
    routeStore.setError(
      err instanceof Error ? err.message : "Route optimization failed.",
    );
  } finally {
    routeStore.setOptimizing(false);
  }

  // ── 4. KPI computation ─────────────────────────────────────────────
  kpiStore.setLoading(true);
  try {
    const kpis: KPIData = generateKPIs({
      customers: ranked,
      route: optimized ?? undefined,
      baselineRouteDurationMinutes:
        useRouteStore.getState().baselineDurationMinutes ?? undefined,
    });
    kpiStore.setKpis(kpis);
    kpiStore.setError(null);
  } catch (err) {
    kpiStore.setError(err instanceof Error ? err.message : "KPI build failed.");
  } finally {
    kpiStore.setLoading(false);
  }

  // ── 5. AI brief + insights in parallel ─────────────────────────────
  aiStore.setGeneratingInsights(true);
  aiStore.setInsightsError(null);

  const currentKpis = useKPIStore.getState().kpis ?? undefined;
  const insightsPromise = fetchInsights(
    ranked,
    optimized ?? undefined,
    currentKpis,
    options.signal,
  );
  const briefPromise = fetchBrief(
    ranked,
    optimized ?? undefined,
    currentKpis,
    options.signal,
  );

  const [insightsResult, briefResult] = await Promise.allSettled([
    insightsPromise,
    briefPromise,
  ]);

  if (insightsResult.status === "fulfilled" && insightsResult.value) {
    aiStore.setInsights(insightsResult.value);
  } else if (insightsResult.status === "rejected") {
    aiStore.setInsightsError(
      insightsResult.reason instanceof Error
        ? insightsResult.reason.message
        : "Insights unavailable.",
    );
  }

  if (briefResult.status === "fulfilled" && briefResult.value) {
    aiStore.setDailyBrief(briefResult.value);
  }

  aiStore.setGeneratingInsights(false);
}

// ── Copilot dispatch (used by the chat composer) ─────────────────────

export async function dispatchCopilotMessage(
  userContent: string,
  options: { signal?: AbortSignal } = {},
): Promise<ChatResponse | null> {
  const aiStore = useAIStore.getState();
  const customerStore = useCustomerStore.getState();
  const routeStore = useRouteStore.getState();
  const kpiStore = useKPIStore.getState();

  const trimmed = userContent.trim();
  if (!trimmed) return null;

  aiStore.setChatting(true);
  aiStore.setChatError(null);

  // The UI is expected to append the user message before calling this
  // helper (so the bubble appears immediately). We re-read history here
  // to pick that message up.
  const history = useAIStore.getState().chatHistory;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        context: {
          customers: customerStore.ranked,
          route: routeStore.route ?? undefined,
          kpis: kpiStore.kpis ?? undefined,
          history,
        },
      }),
      signal: options.signal,
    });
    if (!res.ok) {
      throw new Error(`Chat responded ${res.status}`);
    }
    const envelope = (await res.json()) as AIResponseEnvelope<ChatResponse>;
    const response = envelope.data;
    if (response?.message) {
      aiStore.appendMessage(response.message);
    }
    return response;
  } catch (err) {
    aiStore.setChatError(
      err instanceof Error ? err.message : "Copilot unavailable.",
    );
    return null;
  } finally {
    aiStore.setChatting(false);
  }
}

// ── Private helpers ──────────────────────────────────────────────────

async function fetchInsights(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
  signal?: AbortSignal,
): Promise<AIInsight[] | null> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customers, route, kpis }),
    signal,
  });
  if (!res.ok) return null;
  const envelope = (await res.json()) as AIResponseEnvelope<{
    insights: AIInsight[];
  }>;
  return envelope.data?.insights ?? null;
}

async function fetchBrief(
  customers: RankedCustomer[],
  route: OptimizedRoute | undefined,
  kpis: KPIData | undefined,
  signal?: AbortSignal,
): Promise<DailyBrief | null> {
  const res = await fetch("/api/briefing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customers, route, kpis }),
    signal,
  });
  if (!res.ok) return null;
  const envelope = (await res.json()) as AIResponseEnvelope<{
    brief: DailyBrief;
  }>;
  return envelope.data?.brief ?? null;
}
