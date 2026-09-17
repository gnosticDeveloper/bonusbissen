import { cookies } from "next/headers";

export enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  USER = "USER",
}

export interface Payload {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function isSessionValid(token?: string): boolean {
  if (!token) return false;

  const payload = decodeJwt(token);
  if (!payload) return false;

  const isValidRole = [UserRole.ADMIN, UserRole.CASHIER, UserRole.USER].some((v) => v === payload.role);
  const isExpired = !payload.exp || payload.exp * 1000 < Date.now();

  if (isExpired || !isValidRole) {
    console.info("\n[API] | proxy.ts | The user session is not valid. The token or the role are invalid.\n");
    return false;
  }

  return true;
}

export function getRoleFromToken(token: string): UserRole | null {
  const payload = decodeJwt(token);

  return payload.role;
}

export function decodeJwt(token: string): Payload {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
  return payload;
}

export async function getSessionToken() {
  return (await cookies()).get("access_token")?.value;
}
