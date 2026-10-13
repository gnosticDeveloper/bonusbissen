import { cookies } from "next/headers";
import { errors, importSPKI, jwtVerify, type JWTPayload } from "jose";
import { UserRole } from "../definitions";

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
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
    const response = await fetch(`${backendUrl}/auth/public-key`, { cache: "no-store" });
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

type SessionCheck = { status: "valid"; payload: Payload } | { status: "invalid" | "expired" | "unavailable" };

export async function checkSession(token?: string, area: "customer" | "dashboard" = "customer"): Promise<SessionCheck> {
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

export async function verifySession(token?: string, area: "customer" | "dashboard" = "customer"): Promise<Payload | null> {
  const checked = await checkSession(token, area);
  return checked.status === "valid" ? checked.payload : null;
}

// Decode only for IDs used by server actions; authorization still belongs to the backend.
export function decodeJwt(token: string): Payload {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8")) as Payload;
}

export async function getSessionToken() {
  return (await cookies()).get("access_token")?.value;
}

export async function getDashboardSessionToken() {
  return (await cookies()).get("d_token")?.value;
}
