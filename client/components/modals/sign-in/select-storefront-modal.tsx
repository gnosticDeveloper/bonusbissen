"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import { selectStorefront, StorefrontSummary } from "@/app/d/sign-in/actions";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/modal";

interface SelectStorefrontModalProps {
  storefronts: StorefrontSummary[];
}

export function SelectStorefrontModal({ storefronts }: SelectStorefrontModalProps) {
  const { close } = useModal();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StorefrontSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelection = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      await selectStorefront(id);
      router.push(`/d/${id}/inicio`);
      close();
    } catch (e) {
      setErrorMessage("Algo salió mal. Por favor intenta nuevamente en unos segundos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Locales disponibles" className="flex flex-col gap-2.5">
        {storefronts.map((storefront) => (
          <label
            key={storefront.id}
            className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors duration-200 hover:bg-background has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-2 has-focus-visible:ring-primary/30 has-disabled:cursor-not-allowed has-disabled:opacity-60 motion-reduce:transition-none"
          >
            <input
              type="radio"
              name="storefront"
              value={storefront.id}
              checked={selected?.id === storefront.id}
              onChange={() => setSelected(storefront)}
              disabled={loading}
              className="sr-only"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{storefront.name}</span>
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full border border-border text-primary-foreground transition-colors duration-200 group-has-checked:border-primary group-has-checked:bg-primary motion-reduce:transition-none"
            >
              <svg viewBox="0 0 16 16" fill="none" className="size-3 opacity-0 group-has-checked:opacity-100">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </label>
        ))}
      </div>

      {!loading && errorMessage && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="button" onClick={() => handleSelection(selected?.id)} disabled={loading || !selected} className="w-full">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Entrando...
          </span>
        ) : (
          "Confirmar"
        )}
      </Button>
    </div>
  );
}
