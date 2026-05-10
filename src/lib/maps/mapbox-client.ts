/**
 * Mapbox_Client — singleton bootstrap for Mapbox GL JS.
 *
 * Exposes:
 *   - getMapboxToken(): resolve NEXT_PUBLIC_MAPBOX_TOKEN (browser or server).
 *   - hasMapboxToken():  quick availability check for fallback decisions.
 *   - getMapboxGL():     lazily load mapbox-gl in the browser and set the
 *                        access token exactly once.
 *
 * The module is safe to import from server components and route handlers —
 * mapbox-gl itself is only loaded when getMapboxGL() is awaited in the
 * browser. Server callers that just need the token string should use
 * getMapboxToken() directly.
 */

export const MAPBOX_TOKEN_ENV = "NEXT_PUBLIC_MAPBOX_TOKEN";

/** Read the public Mapbox token from the environment. Returns "" if unset. */
export function getMapboxToken(): string {
  const raw = process.env[MAPBOX_TOKEN_ENV];
  return typeof raw === "string" ? raw.trim() : "";
}

/** True when a non-empty Mapbox token is available. */
export function hasMapboxToken(): boolean {
  return getMapboxToken().length > 0;
}

// The default export of mapbox-gl in v3+ carries the module API including
// `accessToken`, `Map`, etc. The module namespace also exposes named exports
// like `Map`, but `accessToken` is only settable on the default.
type MapboxGLModule = (typeof import("mapbox-gl"))["default"];

let cachedMapboxGL: MapboxGLModule | null = null;
let pendingLoad: Promise<MapboxGLModule> | null = null;

/**
 * Lazily import mapbox-gl in the browser, cache the module, and assign the
 * public access token. Throws when called on the server or when the token
 * is missing — callers should guard with `hasMapboxToken()` and fall back
 * to the mock layer when appropriate.
 */
export async function getMapboxGL(): Promise<MapboxGLModule> {
  if (typeof window === "undefined") {
    throw new Error(
      "getMapboxGL must only be called in the browser. Use getMapboxToken() on the server.",
    );
  }
  if (cachedMapboxGL) return cachedMapboxGL;
  if (pendingLoad) return pendingLoad;

  const token = getMapboxToken();
  if (!token) {
    throw new Error(
      `${MAPBOX_TOKEN_ENV} is not set. Add it to .env.local before initializing Mapbox GL JS.`,
    );
  }

  pendingLoad = import("mapbox-gl").then((mod) => {
    const mapbox = mod.default;
    mapbox.accessToken = token;
    cachedMapboxGL = mapbox;
    return mapbox;
  });
  return pendingLoad;
}

/** Reset the cached mapbox-gl module. Intended for tests only. */
export function __resetMapboxClientForTests(): void {
  cachedMapboxGL = null;
  pendingLoad = null;
}
