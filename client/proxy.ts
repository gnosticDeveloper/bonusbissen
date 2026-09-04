import { NextRequest, NextResponse } from "next/server";
// import { Payload, UserRole } from "@/lib/auth/session";

// function decodePayload(token: string): Payload | null {
//   try {
//     const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
//     return JSON.parse(atob(payloadB64));
//   } catch {
//     return null;
//   }
// }

// function isExpired(payload: Payload | null) {
//   return !payload?.exp || payload.exp * 1000 < Date.now();
// }

export function proxy(request: NextRequest) {
  // const { pathname } = request.nextUrl;

  // if (pathname.startsWith("/sign-")) return NextResponse.next();
  // const token = request.cookies.get("access_token")?.value;

  // const payload = token ? decodePayload(token) : null;

  // if (!payload) {
  //   return NextResponse.redirect(new URL("/sign-in", request.url));
  // }

  // const isValidRole = [UserRole.ADMIN, UserRole.CASHIER, UserRole.CUSTOMER].some((v) => v === payload.role);
  // if (!token || isExpired(payload) || !isValidRole) {
  //   console.info("\n[API] | proxy.ts | The user session is not valid. The token or the role are invalid.\n");
  //   return NextResponse.redirect(new URL("/sign-in", request.url));
  // }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};
