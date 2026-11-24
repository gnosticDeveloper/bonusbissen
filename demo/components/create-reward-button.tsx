"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useModal } from "./modal";
import type { RewardView as Reward } from "@/lib/demo/actions";
import { DeleteRewardModal } from "./modals/rewards/delete-reward-modal";
import { RewardFormModal } from "./modals/rewards/reward-form-modal";

export function CreateRewardButton({ defaultProgramId }: { defaultProgramId?: string | null }) {
  const { open } = useModal();
  return (
    <Button
      className="self-stretch"
      data-tour="create-reward"
      onClick={() =>
        open(<RewardFormModal defaultProgramId={defaultProgramId} />, {
          title: "Crear recompensa",
          description: "Añade una recompensa al catálogo.",
        })
      }
    >
      <Plus data-icon="inline-start" />
      Nueva recompensa
    </Button>
  );
}

export function EditRewardButton({ reward }: { reward: Reward }) {
  const { open } = useModal();
  return (
    <Button
      variant="outline"
      onClick={() =>
        open(<RewardFormModal reward={reward} />, {
          title: "Actualizar recompensa",
          description: "Modifica los datos de esta recompensa.",
        })
      }
    >
      <Pencil data-icon="inline-start" />
      Editar
    </Button>
  );
}

export function DeleteRewardButton({ reward }: { reward: Reward }) {
  const { open } = useModal();
  return (
    <Button
      variant="destructive"
      onClick={() =>
        open(<DeleteRewardModal reward={reward} />, {
          title: "Eliminar recompensa",
          description: "Esta acción no se puede deshacer.",
        })
      }
    >
      <Trash2 data-icon="inline-start" />
      Eliminar
    </Button>
  );
}
