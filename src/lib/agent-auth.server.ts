/** Device token helpers + a simple in-memory rate limiter for agent endpoints. */
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateDeviceToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

export interface DeviceContext {
  endpointId: string;
  organizationId: string;
}

export async function authenticateDevice(
  db: Db,
  request: Request,
): Promise<DeviceContext | null> {
  const token = bearer(request);
  if (!token) return null;
  const hash = await sha256Hex(token);
  const { data } = await db
    .from("device_tokens")
    .select("endpoint_id, organization_id")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data) return null;
  return {
    endpointId: data.endpoint_id as string,
    organizationId: data.organization_id as string,
  };
}

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Fixed-window rate limit, per key. Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
