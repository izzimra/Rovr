/**
 * POST /api/briefing
 *
 * Produces the executive daily sales brief shown above the insights cards.
 *
 * Request body:
 *   { customers: RankedCustomer[], route?: OptimizedRoute, kpis?: KPIData }
 *
 * Response:
 *   AIResponseEnvelope<{ brief: DailyBrief }>
 */

import { NextRequest } from "next/server";
import { generateDailyBrief } from "../../../lib/ai/generateBrief";
import type { KPIData } from "../../../types/analytics";
import type { RankedCustomer } from "../../../types/customer";
import type { OptimizedRoute } from "../../../types/route";
import { errorJson, okJson } from "../_lib/envelope";

export const runtime = "nodejs";

interface BriefingRequest {
  customers: RankedCustomer[];
  route?: OptimizedRoute;
  kpis?: KPIData;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: BriefingRequest;
  try {
    body = (await req.json()) as BriefingRequest;
  } catch {
    return errorJson("Invalid JSON body.", 400, "bad_request");
  }

  if (!Array.isArray(body?.customers)) {
    return errorJson("Request must include a `customers` array.", 400, "bad_request");
  }

  const brief = await generateDailyBrief({
    customers: body.customers,
    route: body.route,
    kpis: body.kpis,
  });

  return okJson({ brief }, { startTime });
}
