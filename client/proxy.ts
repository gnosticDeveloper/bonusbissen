import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth/session";
import {
  accessCookieOptions,
  CUSTOMER_ACCESS_COOKIE,
  DASHBOARD_STOREFRONTS_COOKIE,
  refreshCookieOptions,
  refreshSession,
  sessionCookies,
  type SessionArea,
} from "@/lib/auth/refresh";

// Rutas que se dejan pasar siempre, sin importar el estado de la sesión
const ALWAYS_PUBLIC_PATHS = ["/d/sign-in", "/verify-email", "/descubrir", "/login-link", "/onboarding"];

// /s/{storefrontId}/afiliarse — pública, sin importar sesión
const AFILIARSE_PATTERN = /^\/s\/[^/]+\/afiliarse(?:\/.*)?$/;

function clearSession(response: NextResponse, area: SessionArea) {
  const names = sessionCookies[area];
  response.cookies.delete(names.access);
  response.cookies.delete(names.refresh);
  if (area === "dashboard") response.cookies.delete(DASHBOARD_STOREFRONTS_COOKIE);
}

async function restoreSession(request: NextRequest, area: SessionArea, redirectTo?: string): Promise<NextResponse | null> {
  const names = sessionCookies[area];
  const raw = request.cookies.get(names.refresh)?.value;
  if (!raw) return null;

  const result = await refreshSession(raw);
  if (result.status === "retry" || result.status === "unavailable") {
    return new NextResponse("No pudimos renovar tu sesión. Probá de nuevo en un momento.", { status: 503 });
  }
  if (result.status === "expired") {
    const response = NextResponse.redirect(new URL(names.signIn, request.url));
    clearSession(response, area);
    return response;
  }

  const session = await checkSession(result.token, area);
  if (session.status === "unavailable") {
    // Rotation already succeeded. Preserve its new credential even if the
    // verification key is unavailable, without granting access to the route.
    const response = new NextResponse("No pudimos verificar tu sesión. Probá de nuevo en un momento.", { status: 503 });
    response.cookies.set(names.refresh, result.cookie.value, refreshCookieOptions(result.cookie.maxAge));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (session.status !== "valid") {
    const response = NextResponse.redirect(new URL(names.signIn, request.url));
    clearSession(response, area);
    return response;
  }

  // Forward the rotated cookies to this request's server components/actions as
  // well as the browser; response cookies alone would leave them using the old JWT.
  request.cookies.set(names.access, result.token);
  request.cookies.set(names.refresh, result.cookie.value);
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(names.access, result.token, accessCookieOptions);
  response.cookies.set(names.refresh, result.cookie.value, refreshCookieOptions(result.cookie.maxAge));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La landing es pública incluso con una sesión vencida. No incluir "/"
  // en la lista de prefijos: eso abriría también las rutas privadas.
  if (pathname === "/") return NextResponse.next();

  // La afiliación es pública, pero conviene renovar una sesión vencida antes
  // de que la página intente consultar membresía.
  if (AFILIARSE_PATTERN.test(pathname)) {
    const token = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
    if (!token || (await checkSession(token)).status === "expired") {
      const restored = await restoreSession(request, "customer");
      if (restored) return restored;
    }
    return NextResponse.next();
  }

  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  // OJO: usar "/d/" con barra (o pathname === "/d") y no "/d" a secas,
  // porque "/descubrir" también arranca con "/d" y quedaría mal clasificado
  // como ruta de dashboard.
  const isDashboard = pathname === "/d" || pathname.startsWith("/d/");
  const area: SessionArea = isDashboard ? "dashboard" : "customer";
  const { signIn: signInUrl, access: cookieName } = sessionCookies[area];
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
      const restored = await restoreSession(request, "customer", "/b");
      if (restored) return restored;
    }
    const response = NextResponse.next();
    if (token && session.status === "invalid") response.cookies.delete(cookieName);
    return response;
  }

  // A partir de acá, la ruta requiere sesión.

  if (!token) {
    const restored = await restoreSession(request, area);
    if (restored) return restored;
  }
  if (!token) {
    // No hay sesión -> mostrar la entrada pública o pedir credenciales del panel.
    return NextResponse.redirect(new URL(isDashboard ? signInUrl : "/descubrir", request.url));
  }

  const session = await checkSession(token, area);
  if (session.status === "expired") {
    const restored = await restoreSession(request, area);
    if (restored) return restored;
  }
  if (session.status === "unavailable") {
    return new NextResponse("No pudimos verificar tu sesión. Probá de nuevo en un momento.", { status: 503 });
  }
  if (session.status === "invalid" || session.status === "expired") {
    const response = NextResponse.redirect(new URL(signInUrl, request.url));
    clearSession(response, area);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff|woff2|ttf|map)$).*)"],
};
