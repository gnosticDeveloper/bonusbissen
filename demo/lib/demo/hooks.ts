"use client";

import { useCallback, useEffect, useState, type DependencyList } from "react";
import { usePathname, useRouter } from "next/navigation";
import { currentCustomer, currentStaff, useDemoState } from "./store";
import { UserRole, type ActionResult } from "./types";

/** Signed-in customer; redirects to the sign-in page when there is none (like `proxy.ts`). */
export function useCustomerSession({ required = true }: { required?: boolean } = {}) {
  const state = useDemoState();
  const router = useRouter();
  const pathname = usePathname();
  const customer = state ? currentCustomer(state) : null;

  useEffect(() => {
    if (!required || !state || customer) return;
    const returnTo = `${pathname}${window.location.search}`;
    router.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }, [required, state, customer, pathname, router]);

  return { state, customer, loading: state === null };
}

/** Signed-in staff member with the storefront chosen at sign-in (the JWT `sf` claim in production). */
export function useStaffSession({ adminOnly = false }: { adminOnly?: boolean } = {}) {
  const state = useDemoState();
  const router = useRouter();
  const staff = state ? currentStaff(state) : null;
  const allowed = staff && (!adminOnly || staff.member.role === UserRole.ADMIN);

  useEffect(() => {
    if (!state) return;
    if (!staff) router.replace("/d/sign-in");
    else if (!allowed) router.replace("/d/inicio");
  }, [state, staff, allowed, router]);

  return { state, staff: allowed ? staff : null };
}

/**
 * Runs a mock action on mount and whenever `deps` change; `reload()` runs it
 * again (the demo's `router.refresh()`). Results of stale runs are ignored.
 */
export function useAsyncData<T>(loader: () => Promise<ActionResult<T>>, deps: DependencyList) {
  const [result, setResult] = useState<ActionResult<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loader()
      .then((next) => {
        if (active) setResult(next);
      })
      .catch(() => {
        if (active) setResult({ ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  /** Shows the loading state while reloading (a retry after an error). */
  const retry = useCallback(() => {
    setResult(null);
    setAttempt((value) => value + 1);
  }, []);

  return { result, reload, retry };
}
