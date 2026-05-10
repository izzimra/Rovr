/**
 * CSV ingestion parser.
 *
 * Takes a raw CSV string (typically the decoded body of a multipart file
 * upload) and returns a partitioned result of `Customer` rows plus any
 * human-readable validation errors. The contract is shared with the
 * `/api/customers/import` route handler.
 *
 * Required columns:   customer_name, latitude, longitude
 * Optional columns:   sales_value, priority, last_visit_days, potential_score
 *
 * Column headers are case-insensitive and whitespace-tolerant. Missing
 * optional values default to 0 so the scoring engine has numeric inputs
 * to work with.
 */

import Papa from "papaparse";
import type { Customer } from "../types/customer";

export interface CsvParseResult {
  valid: Customer[];
  errors: string[];
}

/** Keys we understand in the incoming CSV, normalized to lowercase snake_case. */
const KNOWN_COLUMNS = new Set<string>([
  "customer_name",
  "latitude",
  "longitude",
  "sales_value",
  "priority",
  "last_visit_days",
  "potential_score",
]);

const REQUIRED_COLUMNS = ["customer_name", "latitude", "longitude"] as const;

/**
 * Parse a CSV document into validated `Customer` rows.
 *
 * The function never throws on row-level problems — bad rows are pushed
 * onto `errors` and the good rows are returned in `valid`. Fatal issues
 * (e.g. Papa parse error, missing required header) still surface as
 * entries on `errors` with `valid: []`.
 */
export function parseCustomerCsv(csv: string): CsvParseResult {
  const errors: string[] = [];

  if (!csv || csv.trim().length === 0) {
    return { valid: [], errors: ["CSV is empty."] };
  }

  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Parse error at row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  const headers = parsed.meta.fields ?? [];
  const missingRequired = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingRequired.length > 0) {
    errors.push(
      `Missing required column(s): ${missingRequired.join(", ")}. ` +
        `Headers seen: ${headers.join(", ") || "(none)"}.`,
    );
    return { valid: [], errors };
  }

  const unknown = headers.filter((h) => !KNOWN_COLUMNS.has(h));
  if (unknown.length > 0) {
    errors.push(
      `Ignoring unrecognized column(s): ${unknown.join(", ")}.`,
    );
  }

  const valid: Customer[] = [];
  const rows = parsed.data;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row
    const result = coerceRow(row, rowNumber);
    if ("error" in result) {
      errors.push(result.error);
    } else {
      valid.push(result.customer);
    }
  });

  return { valid, errors };
}

// ---------------------------------------------------------------------------
// Row coercion
// ---------------------------------------------------------------------------

type RowResult = { customer: Customer } | { error: string };

function coerceRow(row: Record<string, string>, rowNumber: number): RowResult {
  const name = (row["customer_name"] ?? "").trim();
  if (!name) {
    return { error: `Row ${rowNumber}: customer_name is required.` };
  }

  const latitude = parseFloatField(row["latitude"]);
  const longitude = parseFloatField(row["longitude"]);

  if (latitude === null) {
    return { error: `Row ${rowNumber}: latitude is not a valid number.` };
  }
  if (longitude === null) {
    return { error: `Row ${rowNumber}: longitude is not a valid number.` };
  }
  if (latitude < -90 || latitude > 90) {
    return {
      error: `Row ${rowNumber}: latitude ${latitude} is outside [-90, 90].`,
    };
  }
  if (longitude < -180 || longitude > 180) {
    return {
      error: `Row ${rowNumber}: longitude ${longitude} is outside [-180, 180].`,
    };
  }

  const salesValue = parseFloatField(row["sales_value"]) ?? 0;
  const priorityRaw = parseIntField(row["priority"]);
  const priority = priorityRaw === null ? 0 : clamp(priorityRaw, 0, 10);
  const lastVisitDays = parseIntField(row["last_visit_days"]) ?? 0;
  const potentialRaw = parseFloatField(row["potential_score"]);
  const potentialScore =
    potentialRaw === null ? 0 : clampFloat(potentialRaw, 0, 100);

  const customer: Customer = {
    customer_name: name,
    latitude,
    longitude,
    sales_value: salesValue,
    priority,
    last_visit_days: lastVisitDays,
    potential_score: potentialScore,
  };

  return { customer };
}

function parseFloatField(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseIntField(raw: string | undefined): number | null {
  const f = parseFloatField(raw);
  return f === null ? null : Math.trunc(f);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
