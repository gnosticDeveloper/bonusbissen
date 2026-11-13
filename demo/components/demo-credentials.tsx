"use client";

import { KeyRound } from "lucide-react";

/** Demo-only hint with the sample account for a sign-in form. */
export function DemoCredentials({
  accounts,
  onUse,
}: {
  accounts: { label: string; identifier: string; password: string; detail?: string }[];
  onUse: (account: { identifier: string; password: string }) => void;
}) {
  return (
    <div data-tour="demo-credentials" className="rounded-[15px] border border-dashed border-primary/50 bg-primary/5 p-3.5">
      <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/80">
        <KeyRound size={14} aria-hidden="true" />
        {accounts.length > 1 ? "Cuentas de ejemplo" : "Cuenta de ejemplo"}
      </p>
      <ul className="grid gap-2">
        {accounts.map((account) => (
          <li key={account.identifier} className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2.5">
            <div className="min-w-0 text-[12px] leading-snug">
              <p className="truncate font-bold text-foreground">{account.label}</p>
              <p className="truncate text-foreground/75">
                {account.detail ? `${account.detail} · ` : ""}
                <span className="font-mono">{account.identifier}</span> / <span className="font-mono">{account.password}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onUse(account)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary"
            >
              Usar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
