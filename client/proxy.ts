import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El sign-in del dashboard siempre se deja pasar, tenga o no sesión válida
  if (pathname.startsWith("/d/sign-in")) return NextResponse.next();

  // El dashboard (/d/*) usa su propia cookie; la app de clientes usa access_token.
  const isDashboard = pathname.startsWith("/d");
  const signInUrl = isDashboard ? "/d/sign-in" : "/sign-in";
  const token = request.cookies.get(isDashboard ? "d_token" : "access_token")?.value;
  const hasValidSession = isSessionValid(token);

  // Rutas de auth (sign-in, sign-up): si ya hay sesión válida, no tiene sentido mostrarlas
  if (pathname.startsWith("/sign-")) {
    if (hasValidSession) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Cualquier otra ruta: requiere sesión válida
  if (!hasValidSession) {
    return NextResponse.redirect(new URL(signInUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff|woff2|ttf|map)$).*)",
  ],
};
