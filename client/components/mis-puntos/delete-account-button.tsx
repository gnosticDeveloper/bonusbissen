"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import EliminarPerfilModal from "@/components/mis-puntos/eliminar-perfil-modal";
import { deleteCustomerById } from "@/app/(customers)/actions";

export default function EliminarPerfilButton({
  customerId,
  pendings,
}: {
  customerId: string;
  pendings: boolean;
}) {
  const router = useRouter();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (pendings) return;
    setMostrarModal(true);
  }

  async function handleConfirmar() {
    setError(null);
    const result = await deleteCustomerById(customerId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Sin esto, la cookie de sesión sigue viva apuntando a un cliente ya
    // inactivo.
    const response = await fetch("/api/customers/logout", { method: "POST" });
    if (response.ok) {
      setMostrarModal(false);
      router.push("/mis-puntos/login");
    }
  }

  return (
    <section className="pt-4 border-t border-ink/10 flex flex-col items-center gap-2">
      <button
        onClick={handleClick}
        disabled={pendings}
        className="flex items-center gap-2 text-lg text-ink-soft underline hover:text-rust-dark transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar mi perfil
      </button>
      {pendings && (
        <p className="text-base text-ink-soft text-center">
          Primero tenés que retirar o cancelar tus canjes pendientes.
        </p>
      )}
      {error && <p className="text-base text-rust-dark text-center">{error}</p>}

      {mostrarModal && (
        <EliminarPerfilModal
          onCancel={() => setMostrarModal(false)}
          onConfirm={handleConfirmar}
        />
      )}
    </section>
  );
}
