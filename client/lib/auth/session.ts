export enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  CUSTOMER = "CUSTOMER",
}

export interface Payload {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
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
