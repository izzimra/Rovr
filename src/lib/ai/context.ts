/**
 * Territory context helper.
 *
 * Converts raw lat/lng into Klang Valley territory labels and describes
 * geographic clusters so prompts can reason about revenue density and
 * cluster play without re-deriving those facts from scratch.
 *
 * The territory bands are coarse Klang Valley zones chosen so a single
 * rep can visualise a day's route at a glance. They are not administrative
 * boundaries — they are a sales-operations mental model.
 */

import type { CustomerSummary, RankedCustomer } from "../../types/customer";

export type Territory =
  | "KLCC"
  | "Bangsar"
  | "Damansara"
  | "Petaling Jaya"
  | "Subang"
  | "Shah Alam"
  | "Bangi/Kajang"
  | "Puchong"
  | "Klang Valley";

/** Coarse lat/lng bands for Klang Valley territories. */
const TERRITORY_BANDS: Array<{
  name: Territory;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}> = [
  { name: "KLCC", latMin: 3.14, latMax: 3.18, lonMin: 101.7, lonMax: 101.73 },
  { name: "Bangsar", latMin: 3.1, latMax: 3.14, lonMin: 101.66, lonMax: 101.7 },
  { name: "Damansara", latMin: 3.14, latMax: 3.2, lonMin: 101.6, lonMax: 101.67 },
  {
    name: "Petaling Jaya",
    latMin: 3.08,
    latMax: 3.14,
    lonMin: 101.6,
    lonMax: 101.66,
  },
  { name: "Subang", latMin: 3.06, latMax: 3.14, lonMin: 101.53, lonMax: 101.62 },
  {
    name: "Shah Alam",
    latMin: 3.02,
    latMax: 3.12,
    lonMin: 101.45,
    lonMax: 101.56,
  },
  {
    name: "Bangi/Kajang",
    latMin: 2.88,
    latMax: 3.02,
    lonMin: 101.72,
    lonMax: 101.82,
  },
  { name: "Puchong", latMin: 2.99, latMax: 3.08, lonMin: 101.6, lonMax: 101.65 },
];

export function classifyTerritory(latitude: number, longitude: number): Territory {
  for (const band of TERRITORY_BANDS) {
    if (
      latitude >= band.latMin &&
      latitude <= band.latMax &&
      longitude >= band.lonMin &&
      longitude <= band.lonMax
    ) {
      return band.name;
    }
  }
  return "Klang Valley";
}

export interface TerritoryCluster {
  name: Territory;
  count: number;
  totalValue: number;
  highTierCount: number;
}

/**
 * Describe territory clusters across a customer list. Used by the prompt
 * layer to hand Gemini a clean geographic summary instead of making the
 * model infer cluster membership from raw lat/lng.
 */
export function describeClusters(
  customers: RankedCustomer[] | CustomerSummary[],
): TerritoryCluster[] {
  const map = new Map<Territory, TerritoryCluster>();

  for (const c of customers) {
    const lat = "latitude" in c ? (c as RankedCustomer).latitude : undefined;
    const lon = "longitude" in c ? (c as RankedCustomer).longitude : undefined;
    if (lat === undefined || lon === undefined) continue;

    const name = classifyTerritory(lat, lon);
    const tier = "tier" in c ? c.tier : "Medium";
    const existing = map.get(name) ?? {
      name,
      count: 0,
      totalValue: 0,
      highTierCount: 0,
    };
    existing.count += 1;
    existing.totalValue += c.sales_value;
    if (tier === "High") existing.highTierCount += 1;
    map.set(name, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 6);
}
