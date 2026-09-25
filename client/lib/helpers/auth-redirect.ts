"use client";

import { useRouter } from "next/navigation";
import { joinStorefront } from "@/app/s/[slug]/afiliarse/actions";

const RETURN_TO_PATTERN = /^\/s\/[^/]+\/afiliarse(?:\/.*)?$/;
const STOREFRONT_ID_PATTERN = /^[^/]+$/;

function sanitizeReturnTo(value: string | null): string | null {
  return value && RETURN_TO_PATTERN.test(value) ? value : null;
}

function sanitizeJoinTo(value: string | null): string | null {
  return value && STOREFRONT_ID_PATTERN.test(value) ? value : null;
}

// Para los links cruzados sign-in <-> sign-up: reenvía el param que haya, tal cual llegó.
export function buildAuthQueryString(searchParams: URLSearchParams): string {
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  const joinTo = sanitizeJoinTo(searchParams.get("joinTo"));

  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (joinTo) params.set("joinTo", joinTo);

  const query = params.toString();
  return query ? `?${query}` : "";
}

// Se llama DESPUÉS de un signIn/signUp exitoso. Si joinStorefront tiene éxito,
// redirige por su cuenta (throw NEXT_REDIRECT) y esta función nunca retorna.
// Por eso no debe llamarse dentro de un try/catch genérico.
export async function completeAuthRedirect(router: ReturnType<typeof useRouter>, searchParams: URLSearchParams) {
  const joinTo = sanitizeJoinTo(searchParams.get("joinTo"));

  if (joinTo) {
    const result = await joinStorefront(joinTo);
    // Solo se llega acá si joinStorefront falló (result.ok === false).
    if (result && !result.ok) {
      router.push(`/s/${joinTo}/afiliarse?joinError=${encodeURIComponent(result.error)}`);
      return;
    }
    return;
  }

  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"));
  router.push(returnTo ?? "/b");
}
