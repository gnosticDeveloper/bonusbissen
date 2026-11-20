"use client";

import { useCallback, useId, useRef, useState, type FormEvent } from "react";

import { UserPlus } from "lucide-react";
import { Autocomplete } from "@/components/autocomplete-input";
import { useModal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import type { CustomerOption as Customer, PagedRequestFunction } from "@/lib/demo/types";

import { addCashier, searchStaffCandidates } from "@/lib/demo/actions";

type StorefrontOption = { id: string; name: string };

type AddCashierProps = {
  storefronts: StorefrontOption[];
  /** Preselected storefront: the one chosen at sign-in, when it's active. */
  defaultStorefrontId: string | null;
  /** Users already on this team; the search hides them. */
  memberUserIds: string[];
};

export function AddCashierButton(props: AddCashierProps) {
  const { open } = useModal();
  const disabled = props.storefronts.length === 0;

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end" data-tour="add-cashier">
      <Button
        disabled={disabled}
        onClick={() =>
          open(<AddCashierForm {...props} />, {
            title: "Agregar cajero",
            description: "Buscá la cuenta de Bonus Bissen de la persona y elegí en qué local va a trabajar.",
          })
        }
      >
        <UserPlus data-icon="inline-start" />
        Agregar cajero
      </Button>
      {disabled ? <p className="text-xs text-foreground/80">Necesitás al menos un local activo.</p> : null}
    </div>
  );
}

function AddCashierForm({ storefronts, defaultStorefrontId, memberUserIds }: AddCashierProps) {

  const notify = useToast();
  const { close } = useModal();
  const personId = useId();
  const storefrontId = useId();
  const errorId = useId();

  const [person, setPerson] = useState<Customer | null>(null);
  const [storefront, setStorefront] = useState(defaultStorefrontId ?? storefronts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  // Stable across renders: `Autocomplete` re-runs its search when `fetchFn` changes.
  const membersKey = memberUserIds.join(",");
  const fetchCandidates = useCallback<PagedRequestFunction<Customer>>(
    async (options) => {
      const members = new Set(membersKey.split(","));
      const page = await searchStaffCandidates(options);
      return { ...page, items: page.items.filter((user) => !members.has(user.id)) };
    },
    [membersKey],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!person) {
      setError("Elegí a la persona que querés agregar.");
      return;
    }

    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await addCashier({ userId: person.id, storefrontId: storefront });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const storefrontName = storefronts.find((s) => s.id === storefront)?.name;
      close();
      notify(`${person.name} ahora es cajero${storefrontName ? ` en ${storefrontName}` : ""}.`);

    } catch {
      // The request may have reached the backend: reload before trying again.
      setError("No pudimos confirmar el alta. Volvé a cargar la página para ver si se agregó antes de reintentar.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" aria-describedby={error ? errorId : undefined} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={personId}>Persona</Label>
        <Autocomplete<Customer>
          inputId={personId}
          selected={person}
          onSelect={(user) => {
            setPerson(user);
            setError(null);
          }}
          onClear={() => setPerson(null)}
          fetchFn={fetchCandidates}
          getId={(user) => user.id}
          displayKeys={["name", "username"]}
          placeholder="Buscar por nombre, usuario o email…"
        />
        <p className="text-xs text-foreground/80">La persona necesita tener una cuenta creada. Se suma al equipo de inmediato.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={storefrontId}>Local</Label>
        <select
          id={storefrontId}
          value={storefront}
          onChange={(event) => setStorefront(event.target.value)}
          required
          className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70"
        >
          {storefronts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <p className="rounded-xl border border-border bg-background/60 p-3 text-xs leading-relaxed text-foreground/80">
        Va a poder sumar puntos a clientes, validar canjes y ver las recompensas de ese local.
      </p>

      {error ? (
        <p id={errorId} role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !person || !storefront}>
          {pending ? "Agregando…" : "Agregar al equipo"}
        </Button>
      </div>
    </form>
  );
}
