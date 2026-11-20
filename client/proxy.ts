import { NextRequest, NextResponse } from "next/server";
import { checkSession } from "@/lib/auth/session";
import { refreshSession } from "@/lib/auth/refresh";
import {
  accessCookieOptions,
  deleteSessionCookies,
  refreshCookieOptions,
  SESSION_AREAS,
  sessionCookies,
  type SessionArea,
} from "@/lib/auth/cookies";

// Rutas que se dejan pasar siempre, sin importar el estado de la sesión
const ALWAYS_PUBLIC_PATHS = ["/d/sign-in", "/verify-email", "/descubrir", "/login-link", "/onboarding"];

// /s/{storefrontId}/afiliarse — pública, sin importar sesión
const AFILIARSE_PATTERN = /^\/s\/[^/]+\/afiliarse(?:\/.*)?$/;

const REFRESH_UNAVAILABLE = "No pudimos renovar tu sesión. Probá de nuevo en un momento.";
const VERIFICATION_UNAVAILABLE = "No pudimos verificar tu sesión. Probá de nuevo en un momento.";

/** Keeps a response that carries or reflects one person's session out of every cache. */
function withNoStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** A temporary failure: the session may still be fine, so its cookies stay as they are. */
function serviceUnavailable(message: string) {
  return withNoStore(new NextResponse(message, { status: 503 }));
}

function rejectSession(request: NextRequest, area: SessionArea, publicRoute: boolean) {
  const names = sessionCookies[area];
  // Drop them for this request as well as for the browser, so the page being
  // rendered does not read the session we just rejected.
  deleteSessionCookies(request.cookies, area);
  const response = publicRoute
    ? NextResponse.next({ request: { headers: request.headers } })
    : NextResponse.redirect(new URL(names.signIn, request.url));
  deleteSessionCookies(response.cookies, area);
  return withNoStore(response);
}

async function restoreSession(request: NextRequest, area: SessionArea, redirectTo?: string, publicRoute = false): Promise<NextResponse | null> {
  const names = sessionCookies[area];
  const raw = request.cookies.get(names.refresh)?.value;
  if (!raw) return null;

  const result = await refreshSession(raw);
  if (result.status === "retry" || result.status === "unavailable") return serviceUnavailable(REFRESH_UNAVAILABLE);
  if (result.status === "expired") return rejectSession(request, area, publicRoute);

  const session = await checkSession(result.token, area);
  if (session.status === "unavailable") {
    // Rotation already succeeded. Preserve its new credential even if the
    // verification key is unavailable, without granting access to the route.
    const response = serviceUnavailable(VERIFICATION_UNAVAILABLE);
    response.cookies.set(names.refresh, result.cookie.value, refreshCookieOptions(result.cookie.maxAge));
    return response;
  }
  if (session.status !== "valid") return rejectSession(request, area, publicRoute);

  // Forward the rotated cookies to this request's server components/actions as
  // well as the browser; response cookies alone would leave them using the old JWT.
  request.cookies.set(names.access, result.token);
  request.cookies.set(names.refresh, result.cookie.value);
  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(names.access, result.token, accessCookieOptions);
  response.cookies.set(names.refresh, result.cookie.value, refreshCookieOptions(result.cookie.maxAge));
  return withNoStore(response);
}

/**
 * La afiliación es pública, pero conviene renovar una sesión vencida antes
 * de que la página intente consultar membresía.
 */
async function handleAfiliarse(request: NextRequest) {
  const token = request.cookies.get(sessionCookies.customer.access)?.value;
  if (!token || (await checkSession(token, "customer")).status === "expired") {
    const restored = await restoreSession(request, "customer");
    if (restored) return restored;
  }
  return NextResponse.next();
}

/**
 * Both sessions are optional here, but any existing expired session must be
 * renewed before the page or action reads its cookies. Never redirect an
 * onboarding action POST to a sign-in page.
 */
async function handleOnboarding(request: NextRequest) {
  const updates: NextResponse[] = [];
  for (const area of SESSION_AREAS) {
    const token = request.cookies.get(sessionCookies[area].access)?.value;
    const status = token ? (await checkSession(token, area)).status : null;
    // "unavailable" is a missing verification key, not a bad session: keep the
    // cookies and let the page report the transient failure.
    if (status === "valid" || status === "unavailable") continue;
    // A token that does not verify — tampered, re-signed, foreign — is never
    // renewed: drop that area's cookies for this request and for the browser,
    // so onboarding restarts at the first step instead of retrying it.
    if (status === "invalid") {
      updates.push(rejectSession(request, area, true));
      continue;
    }
    const restored = await restoreSession(request, area, undefined, true);
    if (!restored) continue;
    updates.push(restored);
    if (restored.status !== 200) {
      for (const previous of updates) {
        for (const cookie of previous.cookies.getAll()) restored.cookies.set(cookie);
      }
      return restored;
    }
  }
  const response = NextResponse.next({ request: { headers: request.headers } });
  for (const update of updates) {
    for (const cookie of update.cookies.getAll()) response.cookies.set(cookie);
  }
  return withNoStore(response);
}

/** Rutas de auth del cliente (sign-in, sign-up): con una sesión válida no tiene sentido mostrarlas. */
async function handleCustomerAuthPage(request: NextRequest) {
  // Server Action POSTs (signIn, signUp, y joinStorefront disparado
  // justo después de loguearse) nunca deben recibir un 307: el cliente
  // lo sigue, recibe HTML y rompe con "unexpected response".
  if (request.headers.has("next-action")) return NextResponse.next();

  const cookieName = sessionCookies.customer.access;
  const token = request.cookies.get(cookieName)?.value;
  const session = await checkSession(token, "customer");
  if (session.status === "valid") return NextResponse.redirect(new URL("/b", request.url));
  if (session.status === "expired" || !token) {
    const restored = await restoreSession(request, "customer", "/b");
    if (restored) return restored;
  }
  const response = NextResponse.next();
  if (token && session.status === "invalid") response.cookies.delete(cookieName);
  return response;
}

/** A route that requires the area's session: renew it when it expired, or send the person to sign in. */
async function handleProtectedRoute(request: NextRequest, area: SessionArea) {
  const { access, signIn } = sessionCookies[area];
  const token = request.cookies.get(access)?.value;

  if (!token) {
    const restored = await restoreSession(request, area);
    if (restored) return restored;
    // No hay sesión -> mostrar la entrada pública o pedir credenciales del panel.
    return NextResponse.redirect(new URL(area === "dashboard" ? signIn : "/descubrir", request.url));
  }

  const session = await checkSession(token, area);
  if (session.status === "valid") return NextResponse.next();
  if (session.status === "expired") {
    const restored = await restoreSession(request, area);
    if (restored) return restored;
  }
  if (session.status === "unavailable") return serviceUnavailable(VERIFICATION_UNAVAILABLE);

  // Invalid, or expired without a refresh cookie to renew it.
  const response = NextResponse.redirect(new URL(signIn, request.url));
  deleteSessionCookies(response.cookies, area);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // La landing es pública incluso con una sesión vencida. No incluir "/"
  // en la lista de prefijos: eso abriría también las rutas privadas.
  if (pathname === "/" || pathname === "/billing") return NextResponse.next();
  if (AFILIARSE_PATTERN.test(pathname)) return handleAfiliarse(request);
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) return handleOnboarding(request);
  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (pathname.startsWith("/sign-")) return handleCustomerAuthPage(request);

  // OJO: usar "/d/" con barra (o pathname === "/d") y no "/d" a secas,
  // porque "/descubrir" también arranca con "/d" y quedaría mal clasificado
  // como ruta de dashboard.
  const isDashboard = pathname === "/d" || pathname.startsWith("/d/");
  return handleProtectedRoute(request, isDashboard ? "dashboard" : "customer");
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|woff|woff2|ttf|map)$).*)"],
};
