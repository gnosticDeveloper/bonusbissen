"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useModal } from "./modal";
import dynamic from "next/dynamic";
import { Reward } from "@/lib/types/reward";
import { ModalContentLoader } from "./modals/action-status-modal";
import { DeleteRewardModal } from "./modals/rewards/delete-reward-modal";

const CreateRewardModal = dynamic(() => import("./modals/rewards/create-reward-modal").then((module) => module.CreateRewardModal), {
  loading: () => <ModalContentLoader label="Cargando formulario…" />,
});

const UpdateRewardModal = dynamic(() => import("./modals/rewards/update-reward-modal").then((module) => module.UpdateRewardModal), {
  loading: () => <ModalContentLoader label="Cargando editor…" />,
});

export function CreateRewardButton() {
  const { open } = useModal();
  return (
    <Button
      className="self-stretch"
      onClick={() =>
        open(<CreateRewardModal />, {
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
