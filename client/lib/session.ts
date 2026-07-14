import { cookies } from "next/headers";

export function decodeCustomerPayload(token: string): { sub: string } {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
}

export function decodeEmployeePayload(token: string): { sub: string; employeeId: string; role: string } {
  const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf-8"));
  return { sub: payload.sub, employeeId: payload.employeeId, role: payload.role };
}

export async function resolveCustomerIdFromSession(): Promise<string | undefined> {
  const token = (await cookies()).get("customer_token");
  if (!token) return undefined;
  return decodeCustomerPayload(token.value).sub;
}
