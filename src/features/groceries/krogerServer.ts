import "server-only";
import { parseProductResponse, type Store } from "./catalog";

const BASE = "https://api.kroger.com/v1";
let cached: { token: string; expires: number } | undefined;
let pending: Promise<string> | undefined;

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.token;
  if (pending) return pending;
  pending = (async () => {
    const id = process.env.KROGER_CLIENT_ID;
    const secret = process.env.KROGER_CLIENT_SECRET;
    if (!id || !secret) throw new Error("Kroger is not configured");
    const response = await fetch(`${BASE}/connect/oauth2/token`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "product.compact" }),
    });
    if (!response.ok) throw new Error("Kroger authorization failed");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("access_token" in data) || typeof data.access_token !== "string" || !("expires_in" in data) || typeof data.expires_in !== "number" || data.expires_in <= 0) throw new Error("Invalid token response");
    cached = { token: data.access_token, expires: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };
    return data.access_token;
  })();
  try { return await pending; } finally { pending = undefined; }
}

async function get(path: string, query: URLSearchParams): Promise<unknown> {
  const access = await token();
  const response = await fetch(`${BASE}/${path}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${access}`, Accept: "application/json" } });
  if (!response.ok) { if (response.status === 401) cached = undefined; throw new Error("Kroger request failed"); }
  return response.json();
}
export function parseStores(value: unknown): Store[] {
  if (!value || typeof value !== "object" || !("data" in value) || !Array.isArray(value.data)) throw new Error("Invalid locations response");
  return value.data.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const location = entry as { locationId?: unknown; name?: unknown; address?: { addressLine1?: unknown; city?: unknown } };
    if (typeof location.locationId !== "string" || !/^\d{8}$/.test(location.locationId) || typeof location.name !== "string") return [];
    const parts = [location.name, location.address?.addressLine1, location.address?.city].filter((v): v is string => typeof v === "string" && !!v.trim());
    return [{ locationId: location.locationId, name: parts.join(" – ") }];
  });
}
export async function findStores(zip: string): Promise<Store[]> {
  return parseStores(await get("locations", new URLSearchParams({ "filter.zipCode.near": zip, "filter.limit": "20" })));
}
export async function findProducts(locationId: string, term: string) {
  const result = await get("products", new URLSearchParams({ "filter.locationId": locationId, "filter.term": term, "filter.limit": "20" }));
  if (!result || typeof result !== "object" || !("data" in result) || !Array.isArray(result.data)) throw new Error("Invalid products response");
  return parseProductResponse(result);
}
