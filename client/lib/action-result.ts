import { ApiError } from "@/lib/api-error";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; customerId?: string };

/**
 * Server Actions here run in production builds, where Next.js strips
 * thrown-error messages before they cross back to the client — only the
 * digest survives, even through a client-side try/catch. Wrap any action
 * whose caller needs the real error message with this: it catches ApiError
 * server-side (before the RPC boundary) and returns it as a plain value.
 * Anything else (redirects, real bugs) still propagates normally.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: false, error: e.message, code: e.code, customerId: e.customerId };
    }
    throw e;
  }
}
