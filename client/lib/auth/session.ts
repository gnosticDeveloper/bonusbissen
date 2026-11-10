import "server-only"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { errors, importSPKI, jwtVerify, type JWTPayload } from "jose";
import { backendUrl } from "@/lib/backend-url";
import { UserRole } from "@/lib/types/user";
import { CUSTOMER_ACCESS_COOKIE, DASHBOARD_ACCESS_COOKIE, type SessionArea } from "./cookies";

export interface Payload extends JWTPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
  sf?: string;
}

type PublicKey = Awaited<ReturnType<typeof importSPKI>>;

const KEY_TTL_MS = 7 * 60 * 1000;
const ROTATION_RECHECK_MS = 30 * 1000;
let cachedKey: { key: PublicKey; expiresAt: number } | undefined;
let pendingKey: Promise<PublicKey> | undefined;
let lastRotationRecheck = 0;

async function getPublicKey(forceRefresh = false): Promise<PublicKey> {
  if (pendingKey) return pendingKey;
  if (!forceRefresh && cachedKey && Date.now() < cachedKey.expiresAt) return cachedKey.key;

  pendingKey = (async () => {
    const response = await fetch(backendUrl("/auth/public-key"), { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch the JWT public key");

    const { algorithm, format, publicKey } = (await response.json()) as { algorithm: string; format: string; publicKey: string };
    if (algorithm !== "ES256" || format !== "X.509" || typeof publicKey !== "string" || !publicKey) {
      throw new Error("Unexpected JWT public key format");
    }

    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    const key = await importSPKI(pem, "ES256");
    cachedKey = { key, expiresAt: Date.now() + KEY_TTL_MS };
    return key;
  })();

  try {
    return await pendingKey;
  } finally {
    pendingKey = undefined;
  }
}

export type SessionCheck = { status: "valid"; payload: Payload } | { status: "invalid" | "expired" | "unavailable" };

/** Checks the signature and expiry with one key. `wrong-key` means the signature didn't match it. */
async function verifyWith(token: string, key: PublicKey): Promise<JWTPayload | "expired" | "wrong-key" | "invalid"> {
  try {
    return (await jwtVerify(token, key, { algorithms: ["ES256"] })).payload;
  } catch (error) {
    if (error instanceof errors.JWTExpired) return "expired";
    if (error instanceof errors.JWSSignatureVerificationFailed) return "wrong-key";
    return "invalid";
  }
}

/**
 * The backend may have rotated its key before the cached one's TTL ended, so a
 * signature that doesn't match gets one more try with a fresh key. Rechecks are
 * rate-limited so arbitrary invalid signatures can't cause a fetch per request.
 * Returns null when a recheck isn't allowed yet; throws when the key can't be fetched.
 */
async function rotatedPublicKey(): Promise<PublicKey | null> {
  if (Date.now() - lastRotationRecheck < ROTATION_RECHECK_MS) return null;
  lastRotationRecheck = Date.now();
  return getPublicKey(true);
}

export async function checkSession(token?: string, area: SessionArea = "customer"): Promise<SessionCheck> {
  if (!token) return { status: "invalid" };

  let result: Awaited<ReturnType<typeof verifyWith>>;
  try {
    result = await verifyWith(token, await getPublicKey());
    if (result === "wrong-key") {
      const rotated = await rotatedPublicKey();
      result = rotated ? await verifyWith(token, rotated) : "invalid";
    }
  } catch {
    // Only fetching the key throws: verification itself was never possible.
    return { status: "unavailable" };
  }
  if (result === "expired") return { status: "expired" };
  if (typeof result === "string") return { status: "invalid" };

  const payload = result;
  const role = payload.role;
  const validRole = area === "customer" ? role === UserRole.USER : role === UserRole.ADMIN || role === UserRole.CASHIER;
  if (!validRole || !payload.sub || typeof payload.username !== "string" || !payload.iat || !payload.exp) return { status: "invalid" };
  return { status: "valid", payload: payload as Payload };
}

export async function verifySession(token?: string, area: SessionArea = "customer"): Promise<Payload | null> {
  const checked = await checkSession(token, area);
  return checked.status === "valid" ? checked.payload : null;
}

// Decode only for IDs used by server actions; authorization still belongs to the backend.
export function decodeJwt(token: string): Payload {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8")) as Payload;
}

export async function getSessionToken() {
  return (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value;
}

export async function getDashboardSessionToken() {
  return (await cookies()).get(DASHBOARD_ACCESS_COOKIE)?.value;
}

/**
 * Verifies the session of either area in one call, so callers stop repeating
 * `checkSession(await getDashboardSessionToken(), "dashboard")`.
 */
export async function currentSession(area: SessionArea = "customer") {
  return checkSession(area === "dashboard" ? await getDashboardSessionToken() : await getSessionToken(), area);
}

/**
 * The verified dashboard session, or a redirect to the dashboard sign-in. It's
 * cached per request, so the nested dashboard layouts verify the token once.
 */
export const requireDashboardSession = cache(async (): Promise<Payload> => {
  const payload = await verifySession(await getDashboardSessionToken(), "dashboard");
  if (!payload) redirect("/d/sign-in");
  return payload;
});

/**
 * The customer id that several endpoints take as a path segment. Without a
 * session there is nobody to ask about, so this redirects exactly like the
 * `request` wrapper in `@/lib/api` instead of each caller signing the user out.
 */
export async function currentUserId(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/sign-in");
  return decodeJwt(token).sub;
}
