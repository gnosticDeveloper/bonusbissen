"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert, UserMinus } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { removeStaffMember } from "./actions";

type Member = { id: string; name: string; roleLabel: string };

export function RemoveStaffMemberButton({ member }: { member: Member }) {
  const { open } = useModal();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Quitar a ${member.name} del equipo`}
      onClick={() =>
        open(<RemoveStaffMemberConfirm member={member} />, {
          title: "Quitar del equipo",
          description: "La persona pierde el acceso al panel de inmediato.",
        })
      }
    >
      <UserMinus data-icon="inline-start" />
      Quitar
    </Button>
  );
}

function RemoveStaffMemberConfirm({ member }: { member: Member }) {
  const router = useRouter();
  const { close, runWithStatus } = useModal();
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  async function handleRemove() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);

    const result = await runWithStatus(() => removeStaffMember(member.id), {
      loading: { title: "Quitando del equipo", description: `Estamos quitando a ${member.name} del equipo.` },
      success: { title: "Listo", description: `${member.name} ya no forma parte del equipo y se cerraron sus sesiones.` },
      errorTitle: "No pudimos quitarlo del equipo",
    });

    // `runWithStatus` replaced this content, so there is nothing to reset on failure.
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <TriangleAlert className="size-5 shrink-0 text-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          ¿Querés quitar a <strong>{member.name}</strong> ({member.roleLabel.toLowerCase()}) del equipo? Se cierran sus sesiones y deja de
          tener acceso a todos los locales. Su cuenta y su historial se conservan, y podés volver a sumarlo como cajero.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close} disabled={pending}>
          Cancelar
        </Button>
        <Button type="button" variant="destructive" onClick={() => void handleRemove()} disabled={pending}>
          Quitar del equipo
        </Button>
      </div>
    </div>
  );
}
