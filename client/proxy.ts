import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/auth/session";

// Rutas que se dejan pasar siempre, sin importar el estado de la sesión
const ALWAYS_PUBLIC_PATHS = ["/d/sign-in", "/verify-email", "/descubrir"];

// /s/{storefrontId}/afiliarse — pública, sin importar sesión
const AFILIARSE_PATTERN = /^\/s\/[^/]+\/afiliarse(?:\/.*)?$/;

function isPublicPath(pathname: string): boolean {
  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return AFILIARSE_PATTERN.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas: no importa si hay sesión, sesión vencida o no hay token
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // OJO: usar "/d/" con barra (o pathname === "/d") y no "/d" a secas,
  // porque "/descubrir" también arranca con "/d" y quedaría mal clasificado
  // como ruta de dashboard.
  const isDashboard = pathname === "/d" || pathname.startsWith("/d/");
  const signInUrl = isDashboard ? "/d/sign-in" : "/sign-in";
  const token = request.cookies.get(isDashboard ? "d_token" : "access_token")?.value;

  // Rutas de auth (sign-in, sign-up): si ya hay sesión válida, no tiene sentido mostrarlas
  if (pathname.startsWith("/sign-")) {
    // Server Action POSTs (signIn, signUp, y joinStorefront disparado
    // justo después de loguearse) nunca deben recibir un 307: el cliente
    // lo sigue, recibe HTML y rompe con "unexpected response".
    if (request.headers.has("next-action")) {
      return NextResponse.next();
    }
    if (isSessionValid(token)) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // A partir de acá, la ruta requiere sesión.

  if (!token) {
    // No hay token directamente -> usuario nuevo. En el área de cliente lo
    // mandamos a /descubrir en vez de a sign-in; el dashboard no tiene ese
    // equivalente, así que sigue yendo a /d/sign-in.
    return NextResponse.redirect(new URL(isDashboard ? signInUrl : "/descubrir", request.url));
  }

  if (!isSessionValid(token)) {
    // Hay token pero está vencido/inválido -> hubo sesión real, así que
    // pedimos loguearse de nuevo, no lo tratamos como usuario nuevo.
    return NextResponse.redirect(new URL(signInUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff|woff2|ttf|map)$).*)"],
};
