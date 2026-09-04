"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useModal } from "./modal";
import { UpdateRewardModal } from "./modals/rewards/update-reward-modal";
import { Reward } from "@/lib/types/reward";
import { DeleteRewardModal } from "./modals/rewards/delete-reward-modal";
import { CreateRewardModal } from "./modals/rewards/create-reward-modal";

export function CreateRewardButton() {
  const { open } = useModal();
  return (
    <Button onClick={() => open(<CreateRewardModal />, { title: "Crear recompensa", description: "Añade una recompensa al catálogo." })}>
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
        open(<UpdateRewardModal reward={reward} />, {
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
