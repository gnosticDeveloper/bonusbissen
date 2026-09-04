"use client";
import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reward } from "@/lib/types/reward";
import { deleteReward } from "@/app/[orgId]/(employee)/dashboard/rewards/actions";
import { useModal } from "@/components/modal";

export function DeleteRewardModal({ reward }: { reward: Reward }) {
  const { close } = useModal();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deleteReward(reward.id);
      close();
    } catch {
      setError("No se pudo eliminar la recompensa. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          ¿Quieres eliminar <strong>{reward.title}</strong>? La recompensa dejará de estar disponible en el catálogo.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}Eliminar recompensa
        </Button>
      </div>
    </div>
  );
}
