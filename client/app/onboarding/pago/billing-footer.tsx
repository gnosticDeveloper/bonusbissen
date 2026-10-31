"use client";

import { Button } from "@/components/ui/button";
import { leaveBilling } from "./actions";

export function BillingFooter({ disabled, run }: {
  disabled: boolean;
  run: (task: (signal: AbortSignal) => Promise<void>) => Promise<void>;
}) {
  return <footer className="border-t border-border pt-5 text-center">
    <p className="text-sm text-foreground/65">¿Querés seguir con otra cuenta?</p>
    <Button type="button" variant="link" disabled={disabled} onClick={() => void run(async signal => {
      await leaveBilling();
      if (!signal.aborted) window.location.assign("/onboarding");
    })}>Cerrar sesión</Button>
  </footer>;
}
