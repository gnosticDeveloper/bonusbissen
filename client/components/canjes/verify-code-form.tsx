"use client";

import { useActionState, useState } from "react";
import { Check, Ban, AlertCircle, Search } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import CancelExchangeModal from "./cancel-exchange-modal";
import { annulateExchange, approveExchange, verifyCodeAction, VerifyCodeState } from "@/app/(employees)/actions";
import { useFormStatus } from "react-dom";
import { Exchange } from "@/lib/definitions";

const initialState: VerifyCodeState = { error: null, exchange: null };

function VerifyButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors disabled:opacity-50"
    >
      <Search className="h-5 w-5" />
      {pending ? "Verificando..." : "Verificar"}
    </button>
  );
}

// Todo lo que depende de "found" vive acá adentro. Al montarse con
// key={exchange.id} desde el padre, arranca siempre con estado limpio,
// no necesita ningún efecto para "resetearse" cuando cambia el canje.
function FoundExchangePanel({ exchange }: { exchange: Exchange }) {
  const [found, setFound] = useState<Exchange | null>(exchange);
  const [showCancel, setShowCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const employee = useAuth();

  async function handleApprove() {
    if (!found || !employee?.user?.id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await approveExchange(found.id, employee.user.id);
      setFound(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo entregar el canje.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCancel(shouldRefundPoints: boolean = false) {
    if (!found || !employee?.user?.id) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await annulateExchange(found.id, employee.user.id, shouldRefundPoints);
      setShowCancel(false);
      setFound(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo anular el canje.");
      setShowCancel(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!found) return null;

  return (
    <>
      {actionError && (
        <div className="flex items-start gap-2 rounded-xl bg-rust/10 border border-rust/20 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-rust-dark shrink-0 mt-0.5" />
          <p className="text-lg text-rust-dark">{actionError}</p>
        </div>
      )}

      <div className="rounded-xl bg-sage/10 border border-sage/30 px-5 py-4 flex flex-col gap-3">
        <p className="text-lg text-ink-soft">Confirmá que la persona que tenés al frente coincide antes de entregar:</p>
        <p className="text-xl font-semibold text-ink">{found.customerName}</p>
        <p className="text-xl text-ink">
          {found.rewardTitle} - <span className="font-semibold text-amber-dark">{Math.abs(found.points)} pts</span>
        </p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-sage px-5 py-3 text-lg font-medium text-cream hover:bg-sage-dark transition-colors disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
            {submitting ? "Entregando..." : "Entregar"}
          </button>
          <button
            onClick={() => setShowCancel(true)}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-rust/10 px-5 py-3 text-lg font-medium text-rust-dark hover:bg-rust/15 transition-colors disabled:opacity-50"
          >
            <Ban className="h-5 w-5" />
            Anular
          </button>
        </div>
      </div>

      {showCancel && <CancelExchangeModal exchange={found} onCancelAction={() => setShowCancel(false)} onConfirmAction={handleConfirmCancel} />}
    </>
  );
}

export default function VerifyCodeForm() {
  const [state, formAction] = useActionState(verifyCodeAction, initialState);

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col flex-1 gap-4">
      <h3 className="text-2xl font-bold text-ink">Verificar código de canje</h3>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
          autoComplete="off"
          name="code"
          inputMode="numeric"
          placeholder="Ej: 042817"
          className="flex-1 rounded-xl border border-ink/15 bg-cream px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber tracking-widest"
        />
        <VerifyButton />
      </form>

      {state.error && (
        <div className="flex items-start gap-2 rounded-xl bg-rust/10 border border-rust/20 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-rust-dark shrink-0 mt-0.5" />
          <p className="text-lg text-rust-dark">{state.error}</p>
        </div>
      )}

      {state.exchange && <FoundExchangePanel key={state.exchange.id} exchange={state.exchange} />}
    </div>
  );
}
