import { NextRequest, NextResponse } from "next/server";

const EMPLOYEE_ROUTES = ["/", "/canjes", "/recompensas", "/administrar-puntos"];
const CUSTOMER_PUBLIC_ROUTES = ["/mis-puntos/login"];

enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  CUSTOMER = "CUSTOMER",
}

type Payload = {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

function decodePayload(token: string): Payload | null {
  try {
    const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}

function isExpired(payload: Payload | null) {
  return !payload?.exp || payload.exp * 1000 < Date.now();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isEmployeeRoute = EMPLOYEE_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isEmployeeRoute) {
    const token = request.cookies.get("employee_token")?.value;
    const payload = token ? decodePayload(token) : null;
    const hasExpired = isExpired(payload);
    const validRole = payload?.role === UserRole.ADMIN || payload?.role === UserRole.CASHIER;
    console.log({ token, payload, hasExpired, validRole, role: payload?.role })

    if (!token || isExpired(payload) || !validRole) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  const isCustomerRoute =
    pathname.startsWith("/mis-puntos") &&
    !CUSTOMER_PUBLIC_ROUTES.includes(pathname);

  if (isCustomerRoute) {
    const token = request.cookies.get("customer_token")?.value;
    const payload = token ? decodePayload(token) : null;

    if (!token || isExpired(payload)) {
      return NextResponse.redirect(new URL("/mis-puntos/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/verificar-canjes/:path*",
    "/recompensas/:path*",
    "/administrar-puntos/:path*",
    "/mis-puntos/:path*",
  ],
};
