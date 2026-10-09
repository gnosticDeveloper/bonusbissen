import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth/session";
import {
  accessCookieOptions,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  refreshCookieOptions,
  refreshCustomerSession,
} from "@/lib/auth/refresh";

// Rutas que se dejan pasar siempre, sin importar el estado de la sesión
const ALWAYS_PUBLIC_PATHS = ["/d/sign-in", "/verify-email", "/descubrir", "/login-link"];

// /s/{storefrontId}/afiliarse — pública, sin importar sesión
const AFILIARSE_PATTERN = /^\/s\/[^/]+\/afiliarse(?:\/.*)?$/;


async function restoreCustomerSession(request: NextRequest, redirectTo?: string): Promise<NextResponse | null> {
  const raw = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;
  if (!raw) return null;

  const result = await refreshCustomerSession(raw);
  if (result.status === "retry" || result.status === "unavailable") {
    return new NextResponse("No pudimos renovar tu sesión. Probá de nuevo en un momento.", { status: 503 });
  }
  if (result.status === "expired") {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete(CUSTOMER_ACCESS_COOKIE);
    response.cookies.delete(CUSTOMER_REFRESH_COOKIE);
    return response;
  }

  request.cookies.set(CUSTOMER_ACCESS_COOKIE, result.token);
  request.cookies.set(CUSTOMER_REFRESH_COOKIE, result.cookie.value);
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(CUSTOMER_ACCESS_COOKIE, result.token, accessCookieOptions);
  response.cookies.set(CUSTOMER_REFRESH_COOKIE, result.cookie.value, refreshCookieOptions(result.cookie.maxAge));
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La afiliación es pública, pero conviene renovar una sesión vencida antes
  // de que la página intente consultar membresía.
  if (AFILIARSE_PATTERN.test(pathname)) {
    const token = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
    if (!token || (await checkSession(token)).status === "expired") {
      const restored = await restoreCustomerSession(request);
      if (restored) return restored;
    }
    return NextResponse.next();
  }

  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  // OJO: usar "/d/" con barra (o pathname === "/d") y no "/d" a secas,
  // porque "/descubrir" también arranca con "/d" y quedaría mal clasificado
  // como ruta de dashboard.
  const isDashboard = pathname === "/d" || pathname.startsWith("/d/");
  const signInUrl = isDashboard ? "/d/sign-in" : "/sign-in";
  const cookieName = isDashboard ? "d_token" : "access_token";
  const token = request.cookies.get(cookieName)?.value;

  // Rutas de auth (sign-in, sign-up): si ya hay sesión válida, no tiene sentido mostrarlas
  if (pathname.startsWith("/sign-")) {
    // Server Action POSTs (signIn, signUp, y joinStorefront disparado
    // justo después de loguearse) nunca deben recibir un 307: el cliente
    // lo sigue, recibe HTML y rompe con "unexpected response".
    if (request.headers.has("next-action")) {
      return NextResponse.next();
    }
    const session = await checkSession(token);
    if (session.status === "valid") return NextResponse.redirect(new URL("/b", request.url));
    if (session.status === "expired" || !token) {
      const restored = await restoreCustomerSession(request, "/b");
      if (restored) return restored;
    }
    const response = NextResponse.next();
    if (token && session.status === "invalid") response.cookies.delete(cookieName);
    return response;
  }

  // A partir de acá, la ruta requiere sesión.

  if (!token && !isDashboard) {
    const restored = await restoreCustomerSession(request);
    if (restored) return restored;
  }
  if (!token) {
    // No hay sesión -> mostrar la entrada pública o pedir credenciales del panel.
    return NextResponse.redirect(new URL(isDashboard ? signInUrl : "/descubrir", request.url));
  }

  const session = await checkSession(token, isDashboard ? "dashboard" : "customer");
  if (!isDashboard && session.status === "expired") {
    const restored = await restoreCustomerSession(request);
    if (restored) return restored;
  }
  if (session.status === "unavailable") {
    return new NextResponse("No pudimos verificar tu sesión. Probá de nuevo en un momento.", { status: 503 });
  }
  if (session.status === "invalid" || session.status === "expired") {
    const response = NextResponse.redirect(new URL(signInUrl, request.url));
    response.cookies.delete(cookieName);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff|woff2|ttf|map)$).*)"],
};
