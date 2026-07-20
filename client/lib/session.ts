import { cookies } from "next/headers";

export function decodeCustomerPayload(token: string): {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
} {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
}

export function decodeEmployeePayload(token: string): {
  sub: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
} {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
  return payload;
}

export async function resolveCustomerIdFromSession(): Promise<string | undefined> {
  const token = (await cookies()).get("customer_token");
  if (!token) return undefined;
  return decodeCustomerPayload(token.value).sub;
}
