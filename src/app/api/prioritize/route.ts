/**
 * POST /api/prioritize
 *
 * Accepts a list of Customer_Records and returns them ranked with the
 * deterministic scoring engine + Gemini-authored explanations for the
 * top-N rows.
 *
 * Request body:
 *   { customers: Customer[], topN?: number }
 *
 * Response:
 *   AIResponseEnvelope<{ ranked: RankedCustomer[] }>
 */

import { NextRequest } from "next/server";
import { rankCustomers } from "../../../lib/scoring/rankCustomers";
import { explainCustomerPriorities } from "../../../lib/ai/generateReasoning";
import { CallTrace } from "../../../lib/gemini/helpers";
import type { Customer } from "../../../types/customer";
import { errorJson, okJson } from "../_lib/envelope";

export const runtime = "nodejs";

interface PrioritizeRequest {
  customers: Customer[];
  topN?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let body: PrioritizeRequest;
  try {
    body = (await req.json()) as PrioritizeRequest;
  } catch {
    return errorJson("Invalid JSON body.", 400, "bad_request");
  }

  if (!Array.isArray(body?.customers)) {
    return errorJson(
      "Request must include a `customers` array.",
      400,
      "bad_request",
    );
  }

  const trace = new CallTrace();
  const ranked = rankCustomers(body.customers);
  const hydrated = await explainCustomerPriorities(ranked, {
    topN: body.topN ?? 10,
    trace,
  });

  return okJson(
    { ranked: hydrated },
    { startTime, trace, service: "customer_reasoning" },
  );
}
