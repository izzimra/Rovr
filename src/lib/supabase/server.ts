/**
 * Supabase server clients.
 *
 * Two flavors:
 *   - `getSupabaseRouteClient()` — SSR-aware client that reads the user
 *     session from Next.js request cookies. Use this inside `app/api/*`
 *     route handlers that need `auth.uid()` for RLS-scoped reads/writes.
 *   - `getSupabaseServiceClient()` — elevated client that bypasses RLS.
 *     Use sparingly for admin-only operations; never expose its key to
 *     the browser.
 *
 * Credentials come from the existing Rovr env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY (server-only)
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env.local for the Supabase client.`,
    );
  }
  return value;
}

/**
 * Build a per-request Supabase client that respects the user's session.
 * Call this once per API route invocation.
 */
export async function getSupabaseRouteClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(entries: { name: string; value: string; options: CookieOptions }[]) {
          // In route handlers we're allowed to mutate cookies; in server
          // components this would throw, which is fine — we only call this
          // from API routes.
          try {
            for (const { name, value, options } of entries) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* no-op: read-only context */
          }
        },
      },
    },
  );
}

let cachedServiceClient: SupabaseClient | null = null;

/**
 * Elevated service-role client. Bypasses RLS. Intended for admin-only
 * paths (e.g. background jobs, migrations). Never ship to the browser.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseServiceClient must only be called on the server.");
  }
  if (!cachedServiceClient) {
    cachedServiceClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return cachedServiceClient;
}
