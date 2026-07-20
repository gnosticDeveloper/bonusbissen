"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Search, Check, Ban, AlertCircle } from "lucide-react";
import CancelExchangeModal from "@/components/canjes/cancel-exchange-modal";
import { annulateExchange, verifyCodeAction, type VerifyCodeState } from "@/app/(employees)/actions";
import { useAuth } from "@/providers/auth-provider";

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

export default function VerifyCodeForm() {
  const [state, formAction] = useActionState(verifyCodeAction, initialState);
  const [showCancel, setShowCancel] = useState(false);

  const found = state.exchange;

  const employee = useAuth();

  function handleApprove() {
    if (!found) return;
    // TODO: falta la Server Action de aprobar el canje. Cuando exista,
    // acá también correspondería revalidateTag para que la lista y el
    // ping del sidebar se actualicen.
  }

  async function handleConfirmCancel() {
    if (!found) return;

    await annulateExchange(found.id, employee?.user?.id ?? "");
    setShowCancel(false);
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col flex-1 gap-4">
      <h3 className="text-2xl font-bold text-ink">Verificar código de canje</h3>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="text"
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

      {found && (
        <div className="rounded-xl bg-sage/10 border border-sage/30 px-5 py-4 flex flex-col gap-3">
          <p className="text-lg text-ink-soft">Confirmá que la persona que tenés al frente coincide antes de entregar:</p>
          <p className="text-xl font-semibold text-ink">{found.customerName}</p>
          <p className="text-xl text-ink">
            {found.rewardTitle} - <span className="font-semibold text-amber-dark">{found.points} pts</span>
          </p>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 rounded-xl bg-sage px-5 py-3 text-lg font-medium text-cream hover:bg-sage-dark transition-colors"
            >
              <Check className="h-5 w-5" />
              Entregar
            </button>
            <button
              onClick={() => setShowCancel(true)}
              className="flex items-center gap-2 rounded-xl bg-rust/10 px-5 py-3 text-lg font-medium text-rust-dark hover:bg-rust/15 transition-colors"
            >
              <Ban className="h-5 w-5" />
              Anular
            </button>
          </div>
        </div>
      )}

      {showCancel && found && (
        <CancelExchangeModal exchange={found} onCancelAction={() => setShowCancel(false)} onConfirmAction={handleConfirmCancel} />
      )}
    </div>
  );
}
