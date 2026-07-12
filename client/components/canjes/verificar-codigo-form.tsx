"use client";

import { SubmitEventHandler, useState } from "react";
import { Search, Check, Ban, AlertCircle } from "lucide-react";
import AnularModal from "@/components/canjes/anular-modal";
import { Exchange } from "@/lib/definitions";

type VerificarCodigoFormProps = {
  exchanges: Exchange[];
  onApproveAction: (id: string) => void;
  onCancelAction: (id: string, motivo: string) => void;
};

export default function VerificarCodigoForm({ exchanges, onApproveAction: onApprove, onCancelAction: onCalcel }: VerificarCodigoFormProps) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Exchange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  // TODO: the code should be verified against the server, not locally.
  const handler: SubmitEventHandler = async (e) => {
    e.preventDefault();
    const match = exchanges.find((c) => c.code === code.trim() && c.state === "pending");
    if (!match) {
      setError("No encontramos ese código entre los canjes pendientes. Recibilo con cuidado del cliente y volvé a ingresarlo.");
      setFound(null);
      return;
    }
    setError(null);
    setFound(match);
  }

  function handleEntregar() {
    if (!found) return;
    onApprove(found.id);
    setFound(null);
    setCode("");
  }

  function handleConfirmarAnular(motivo: string) {
    if (!found) return;
    onCalcel(found.id, motivo);
    setShowCancel(false);
    setFound(null);
    setCode("");
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col flex-1 gap-4">
      <h3 className="text-2xl font-bold text-ink">Verificar código de canje</h3>

      <form onSubmit={handler} className="flex flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setFound(null);
            setError(null);
          }}
          placeholder="Ej: 042817"
          className="flex-1 rounded-xl border border-ink/15 bg-cream px-5 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber tracking-widest"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
        >
          <Search className="h-5 w-5" />
          Verificar
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rust/10 border border-rust/20 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-rust-dark shrink-0 mt-0.5" />
          <p className="text-lg text-rust-dark">{error}</p>
        </div>
      )}

      {found && (
        <div className="rounded-xl bg-sage/10 border border-sage/30 px-5 py-4 flex flex-col gap-3">
          <p className="text-lg text-ink-soft">Confirmá que la persona que tenés al frente coincide antes de entregar:</p>
          <div>
            <p className="text-xl font-semibold text-ink">{found.clienteNombre}</p>
            <p className="text-lg text-ink-soft">
              DNI {found.documento} · {found.telefono}
            </p>
          </div>
          <p className="text-xl text-ink">
            {found.recompensa} — <span className="font-semibold text-amber-dark">{found.puntos} pts</span>
          </p>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleEntregar}
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

      {showCancel && found && <AnularModal exchange={found} onCancelAction={() => setShowCancel(false)} onConfirmAction={handleConfirmarAnular} />}
    </div>
  );
}
