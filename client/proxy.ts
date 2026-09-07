import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const hasValidSession = isSessionValid(token);

  // El sign-in del dashboard siempre se deja pasar, tenga o no sesión válida
  if (pathname.startsWith("/d/sign-in")) return NextResponse.next();

  // Rutas de auth (sign-in, sign-up): si ya hay sesión válida, no tiene sentido mostrarlas
  if (pathname.startsWith("/sign-")) {
    if (hasValidSession) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Cualquier otra ruta: requiere sesión válida
  if (!hasValidSession) {
    console.info("\n[API] | proxy.ts | The user session is not valid. The token or the role are invalid.\n");
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|_next/static|_next/image|.*\\.png$).*)",
  ],
};
