/**
 * POST /api/customers/import
 *
 * Accepts a multipart/form-data upload with a `file` field containing a
 * CSV of customer rows. Flow:
 *
 *   1. Authenticate via the SSR Supabase client. Return 401 if absent.
 *   2. Decode the file to text and hand it to the shared `parseCustomerCsv`.
 *   3. Bulk-insert the valid rows with `user_id = auth.uid()` so RLS
 *      policies allow the write.
 *   4. Respond with `{ inserted, errors }` — the errors array combines
 *      parse warnings, per-row validation errors, and (if the DB insert
 *      partially fails) a database error string.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCustomerCsv } from "../../../../lib/csv-parser";
import { getSupabaseRouteClient } from "../../../../lib/supabase/server";
import type { Customer } from "../../../../types/customer";

export const runtime = "nodejs";

interface ImportResponse {
  inserted: number;
  errors: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse<ImportResponse>> {
  // ---------------------------------------------------------------------
  // 1. Authenticate
  // ---------------------------------------------------------------------
  const supabase = await getSupabaseRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { inserted: 0, errors: ["Unauthorized"] },
      { status: 401 },
    );
  }

  // ---------------------------------------------------------------------
  // 2. Read the uploaded file
  // ---------------------------------------------------------------------
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { inserted: 0, errors: ["Request must be multipart/form-data."] },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { inserted: 0, errors: ["Missing `file` field in upload."] },
      { status: 400 },
    );
  }

  const csv = await file.text();

  // ---------------------------------------------------------------------
  // 3. Parse + validate
  // ---------------------------------------------------------------------
  const { valid, errors } = parseCustomerCsv(csv);

  if (valid.length === 0) {
    return NextResponse.json({ inserted: 0, errors }, { status: 400 });
  }

  // ---------------------------------------------------------------------
  // 4. Bulk insert — user_id stamped server-side so the client can't spoof.
  // ---------------------------------------------------------------------
  const rows = valid.map((c) => toInsertRow(c, user.id));
  const { data, error: insertError } = await supabase
    .from("customers")
    .insert(rows)
    .select("id");

  if (insertError) {
    errors.push(`Database insert failed: ${insertError.message}`);
    return NextResponse.json({ inserted: 0, errors }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data?.length ?? rows.length,
    errors,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CustomerInsertRow {
  user_id: string;
  customer_name: string;
  latitude: number;
  longitude: number;
  sales_value: number;
  priority: number;
  last_visit_days: number;
  potential_score: number;
}

function toInsertRow(c: Customer, userId: string): CustomerInsertRow {
  return {
    user_id: userId,
    customer_name: c.customer_name,
    latitude: c.latitude,
    longitude: c.longitude,
    sales_value: c.sales_value,
    priority: c.priority,
    last_visit_days: c.last_visit_days,
    potential_score: c.potential_score,
  };
}
