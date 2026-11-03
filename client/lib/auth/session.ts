import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { errors, importSPKI, jwtVerify, type JWTPayload } from "jose";
import { backendUrl } from "@/lib/backend-url";
import { UserRole } from "../definitions";
import { CUSTOMER_ACCESS_COOKIE, DASHBOARD_ACCESS_COOKIE, type SessionArea } from "./cookies";

export interface Payload extends JWTPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
  sf?: string;
}

const KEY_TTL_MS = 7 * 60 * 1000;
const ROTATION_RECHECK_MS = 30 * 1000;
let cachedKey: { key: Awaited<ReturnType<typeof importSPKI>>; expiresAt: number } | undefined;
let pendingKey: Promise<Awaited<ReturnType<typeof importSPKI>>> | undefined;
let lastRotationRecheck = 0;

async function getPublicKey(forceRefresh = false) {
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

export async function checkSession(token?: string, area: SessionArea = "customer"): Promise<SessionCheck> {
  if (!token) return { status: "invalid" };

  let key: Awaited<ReturnType<typeof importSPKI>>;
  try {
    key = await getPublicKey();
  } catch {
    return { status: "unavailable" };
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, key, { algorithms: ["ES256"] }));
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { status: "expired" };
    // A newly rotated backend key can arrive before the seven-minute TTL ends.
    // Limit retries so arbitrary invalid signatures cannot cause a fetch per request.
    if (!(error instanceof errors.JWSSignatureVerificationFailed) || Date.now() - lastRotationRecheck < ROTATION_RECHECK_MS) {
      return { status: "invalid" };
    }
    lastRotationRecheck = Date.now();
    try {
      key = await getPublicKey(true);
    } catch {
      return { status: "unavailable" };
    }
    try {
      ({ payload } = await jwtVerify(token, key, { algorithms: ["ES256"] }));
    } catch (retryError) {
      return { status: retryError instanceof errors.JWTExpired ? "expired" : "invalid" };
    }
  }

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
 * The customer id that several endpoints take as a path segment. Without a
 * session there is nobody to ask about, so this redirects exactly like the
 * `request` wrapper in `@/lib/api` instead of each caller signing the user out.
 */
export async function currentUserId(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/sign-in");
  return decodeJwt(token).sub;
}
