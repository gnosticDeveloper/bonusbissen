"use client";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RewardView as Reward } from "@/lib/demo/actions";
import { useModal } from "@/components/modal";
import { deleteReward } from "@/lib/demo/actions";

export function DeleteRewardModal({ reward }: { reward: Reward }) {

  const { close, runWithStatus } = useModal();

  async function handleDelete() {
    const result = await runWithStatus(() => deleteReward(reward.id), {
      loading: {
        title: "Eliminando recompensa",
        description: `Estamos quitando ${reward.title} del catálogo.`,
      },
      success: {
        title: "Recompensa eliminada",
        description: `${reward.title} ya no está disponible en el catálogo.`,
      },
      errorTitle: "No pudimos eliminar la recompensa",
    });


  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <TriangleAlert className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          ¿Quieres eliminar <strong>{reward.title}</strong>? La recompensa dejará de estar disponible en el catálogo.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete}>
          Eliminar recompensa
        </Button>
      </div>
    </div>
  );
}
