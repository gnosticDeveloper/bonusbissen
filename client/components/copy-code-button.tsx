"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "./toast";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();

  async function handleCopy() {
    try {
      const type = "text/plain";
      const clipboardItem = new ClipboardItem({
        [type]: code,
      });

      await navigator.clipboard.write([clipboardItem]);

      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("Hubo un problema al copiar el código", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Código copiado" : "Copiar código de canje"}
      className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-primary/25 bg-primary/10 px-3.5 py-3 text-primary transition-colors hover:bg-primary/15 active:scale-[0.99] active:bg-primary/20"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
        Código
      </span>

      <span className="font-mono text-base font-bold tracking-[0.25em]">
        {code}
      </span>

      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
