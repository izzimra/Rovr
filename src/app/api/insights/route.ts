/**
 * POST /api/insights
 *
 * Produces the AI insights cards rendered in the insights panel.
 *
 * Request body:
 *   { customers: RankedCustomer[], route?: OptimizedRoute, kpis?: KPIData }
 *
 * Response:
 *   AIResponseEnvelope<{ insights: AIInsight[] }>
 */

import { NextRequest } from "next/server";
import { generateInsights } from "../../../lib/ai/generateInsights";
import type { KPIData } from "../../../types/analytics";
import type { RankedCustomer } from "../../../types/customer";
import type { OptimizedRoute } from "../../../types/route";
import { errorJson, okJson } from "../_lib/envelope";

export const runtime = "nodejs";

interface InsightsRequest {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: InsightsRequest;
  try {
    body = (await req.json()) as InsightsRequest;
  } catch {
    return errorJson("Invalid JSON body.", 400, "bad_request");
  }

  if (!Array.isArray(body?.customers)) {
    return errorJson("Request must include a `customers` array.", 400, "bad_request");
  }

  const insights = await generateInsights({
    customers: body.customers,
    route: body.route,
    kpis: body.kpis,
  });

  return okJson({ insights }, { startTime });
}
