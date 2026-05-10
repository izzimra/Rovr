/**
 * Mock customer seed data.
 *
 * Hand-curated set of 18 realistic Malaysian B2B customers distributed
 * across Kuala Lumpur, Bangsar, Petaling Jaya, Shah Alam, Bangi, and Subang.
 * Coordinates are real lat/lng for the referenced neighborhoods so the
 * Maps_View renders a plausible route on first load.
 *
 * Used by:
 *  - Requirement 16 (first-load seeding + Demo_Mode)
 *  - Local development when the Data_Store has no user rows
 */

import type { Customer } from "../../types/customer";

export const MOCK_CUSTOMERS: Customer[] = [
  {
    customer_name: "Petronas Twin Towers Corporate",
    latitude: 3.1579,
    longitude: 101.7116,
    sales_value: 185000,
    priority: 9,
    last_visit_days: 14,
    potential_score: 92,
  },
  {
    customer_name: "KLCC Fintech Partners",
    latitude: 3.1587,
    longitude: 101.7138,
    sales_value: 142000,
    priority: 8,
    last_visit_days: 7,
    potential_score: 88,
  },
  {
    customer_name: "Bukit Bintang Retail Group",
    latitude: 3.1478,
    longitude: 101.7108,
    sales_value: 96000,
    priority: 7,
    last_visit_days: 21,
    potential_score: 74,
  },
  {
    customer_name: "Bangsar South Tech Hub",
    latitude: 3.1118,
    longitude: 101.6696,
    sales_value: 128000,
    priority: 8,
    last_visit_days: 10,
    potential_score: 85,
  },
  {
    customer_name: "Bangsar Village Advisory",
    latitude: 3.1291,
    longitude: 101.6707,
    sales_value: 73000,
    priority: 6,
    last_visit_days: 45,
    potential_score: 68,
  },
  {
    customer_name: "Mid Valley Megastores",
    latitude: 3.1176,
    longitude: 101.6774,
    sales_value: 156000,
    priority: 9,
    last_visit_days: 5,
    potential_score: 90,
  },
  {
    customer_name: "Petaling Jaya Industrial",
    latitude: 3.1073,
    longitude: 101.6067,
    sales_value: 112000,
    priority: 7,
    last_visit_days: 18,
    potential_score: 78,
  },
  {
    customer_name: "Damansara Heights Holdings",
    latitude: 3.1536,
    longitude: 101.6559,
    sales_value: 205000,
    priority: 9,
    last_visit_days: 3,
    potential_score: 95,
  },
  {
    customer_name: "Uptown Damansara Capital",
    latitude: 3.1543,
    longitude: 101.6239,
    sales_value: 88000,
    priority: 6,
    last_visit_days: 28,
    potential_score: 71,
  },
  {
    customer_name: "Shah Alam Manufacturing Co",
    latitude: 3.0733,
    longitude: 101.5185,
    sales_value: 167000,
    priority: 8,
    last_visit_days: 12,
    potential_score: 83,
  },
  {
    customer_name: "i-City Logistics",
    latitude: 3.0587,
    longitude: 101.4867,
    sales_value: 92000,
    priority: 6,
    last_visit_days: 40,
    potential_score: 65,
  },
  {
    customer_name: "Setia Alam Distribution",
    latitude: 3.1027,
    longitude: 101.4711,
    sales_value: 78000,
    priority: 5,
    last_visit_days: 35,
    potential_score: 60,
  },
  {
    customer_name: "Bangi Tech Campus",
    latitude: 2.9427,
    longitude: 101.7867,
    sales_value: 134000,
    priority: 8,
    last_visit_days: 9,
    potential_score: 81,
  },
  {
    customer_name: "Kajang Business Park",
    latitude: 2.9932,
    longitude: 101.7876,
    sales_value: 61000,
    priority: 4,
    last_visit_days: 55,
    potential_score: 48,
  },
  {
    customer_name: "Subang Jaya SS15 Retail",
    latitude: 3.0762,
    longitude: 101.5852,
    sales_value: 104000,
    priority: 7,
    last_visit_days: 16,
    potential_score: 76,
  },
  {
    customer_name: "Subang Airport Logistics",
    latitude: 3.1307,
    longitude: 101.5595,
    sales_value: 118000,
    priority: 7,
    last_visit_days: 22,
    potential_score: 79,
  },
  {
    customer_name: "Sunway Pyramid Ventures",
    latitude: 3.0726,
    longitude: 101.6071,
    sales_value: 149000,
    priority: 8,
    last_visit_days: 11,
    potential_score: 86,
  },
  {
    customer_name: "Puchong Industrial Link",
    latitude: 3.0203,
    longitude: 101.6158,
    sales_value: 54000,
    priority: 3,
    last_visit_days: 72,
    potential_score: 42,
  },
];

/** Returns a fresh copy so callers can mutate safely without polluting the seed. */
export function getMockCustomers(): Customer[] {
  return MOCK_CUSTOMERS.map((c) => ({ ...c }));
}
