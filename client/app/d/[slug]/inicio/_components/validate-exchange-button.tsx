"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { approveExchangeWithCode } from "@/app/d/actions";
import { useModal } from "@/components/modal";
import { ActionStatusModal } from "@/components/modals/action-status-modal";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { formatNumber } from "@/lib/helpers/format";
import type { PendingExchangeReview } from "@/lib/types/dashboard";

const CODE_LENGTH = 6;

export function ValidateExchangeButton({ exchange }: { exchange: PendingExchangeReview }) {
  const { open } = useModal();
  return (
    <Button
      size="sm"
      onClick={() =>
        open(<ValidateExchangeForm exchange={exchange} />, {
          title: "Validar canje",
          description: `Pedile a ${exchange.userName} el código de canje y escribilo abajo.`,
        })
      }
      aria-label={`Validar el canje de ${exchange.rewardTitle} de ${exchange.userName}`}
    >
      Validar
    </Button>
  );
}

/**
 * Asks for the customer's code and approves this one redemption with it. The backend checks the
 * code belongs to this redemption; a wrong code keeps the form open so staff can retry.
 */
function ValidateExchangeForm({ exchange }: { exchange: PendingExchangeReview }) {
  const router = useRouter();
  const { open, close } = useModal();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const normalized = code.trim().toLowerCase();
    if (normalized.length !== CODE_LENGTH) {
      setError(`El código tiene ${CODE_LENGTH} caracteres.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await approveExchangeWithCode(exchange.id, normalized);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      // Already resolved elsewhere (409): the row is stale, so refresh the list behind the modal.
      if (result.status === 409) router.refresh();
      return;
    }

    open(<ActionStatusModal status="success" onClose={close} />, {
      title: "Canje validado",
      description: `La entrega de ${exchange.rewardTitle} a ${exchange.userName} quedó registrada.`,
    });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-border bg-background/60 p-4 text-sm">
        <dt className="text-foreground/80">Cliente</dt>
        <dd className="truncate font-medium text-foreground">{exchange.userName}</dd>
        <dt className="text-foreground/80">Recompensa</dt>
        <dd className="truncate font-medium text-foreground">{exchange.rewardTitle}</dd>
        <dt className="text-foreground/80">Puntos</dt>
        <dd className="font-medium text-foreground">{formatNumber(Math.abs(exchange.points))} pts</dd>
      </dl>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`code-${exchange.id}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
          Código de canje
        </Label>
        <Input
          id={`code-${exchange.id}`}
          autoFocus
          autoComplete="off"
          maxLength={CODE_LENGTH}
          placeholder="XXXXXX"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `code-${exchange.id}-error` : undefined}
          className="h-12 rounded-xl font-mono uppercase tracking-[0.18em]"
        />
        <div id={`code-${exchange.id}-error`} role="alert">
          <FieldError message={error} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
          {submitting ? "Validando…" : "Confirmar entrega"}
        </Button>
      </div>
    </form>
  );
}
