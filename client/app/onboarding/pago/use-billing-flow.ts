"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BillingData } from "@/lib/billing";
import { RequestGate } from "./request-gate";
import { ActionResult } from "@/lib/api";

export type BillingScreenProps = {
  expectedOrganizationId?: string;
  onContinue?: () => void;
  disabled?: boolean;
};

export function useBillingFlow<T extends BillingData>(
  loader: (id?: string) => Promise<ActionResult<T>>,
  expectedOrganizationId?: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gate = useRef<RequestGate | null>(null);
  const organizationId = useRef(expectedOrganizationId);

  const run = useCallback(async (task: (signal: AbortSignal) => Promise<void>) => {
    await gate.current?.run(async signal => {
      setBusy(true);
      setError(null);
      try { await task(signal); }
      catch {
        if (!signal.aborted) {
          setData(null);
          setError("No pudimos confirmar la respuesta. Reintentá la consulta antes de repetir la operación.");
        }
      } finally { if (!signal.aborted) setBusy(false); }
    });
  }, []);

  const reload = useCallback(async (signal: AbortSignal) => {
    const result = await loader(organizationId.current);
    if (signal.aborted) return null;
    if (!result.ok) { setData(null); setError(result.error); return null; }
    organizationId.current = result.data.organization.id;
    setData(result.data);
    return result.data;
  }, [loader]);

  useEffect(() => {
    const current = new RequestGate();
    gate.current = current;
    organizationId.current = expectedOrganizationId;
    // A new business starts from an empty screen. Clearing it is part of the
    // load, like the busy and error resets in `run`, not a separate step.
    void run(async signal => {
      setData(null);
      await reload(signal);
    });
    return () => current.abort();
  }, [expectedOrganizationId, reload, run]);

  return { data, busy, error, run, reload, setError, setData };
}
