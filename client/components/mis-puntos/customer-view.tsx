"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, Trash2 } from "lucide-react";
import { useCustomerProfileStore } from "@/stores/customer-profile";
import CustomerHeader from "./customer-header";
import CustomerDrawer from "./customer-drawer";
import { formatDate } from "@/lib/format-date";
import { Exchange, Reward } from "@/lib/definitions";
import EliminarPerfilModal from "./eliminar-perfil-modal";

export default function CustomerView({ rewards }: { rewards: Reward[] }) {
  const router = useRouter();
  const customer = useCustomerProfileStore(state => state.customer)!;
  const pendings = await getPendingExchangesByCustomerId(customer.id) as Exchange[];
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const availables = rewards.filter((r) => r.costPoints <= customer.points).sort((a, b) => a.costPoints - b.costPoints);
  const blocked = rewards.filter((r) => r.costPoints > customer.points).sort((a, b) => a.costPoints - b.costPoints);

  async function cancelPending(id: string) {
    await cancelPendingExchange(id);
    setCancelId(null);
  }

  function handleDeleteClick() {
    if (pendings.length > 0) return;
    setMostrarEliminar(true);
  }

  async function handleConfirmDelete() {
    await deleteCustomerById(customer.id);
    setMostrarEliminar(false);
    router.push("/mis-puntos/login");
  }

  return (
    <>
      <CustomerHeader onMenuClick={() => setMenuAbierto(true)} />
      <CustomerDrawer isOpen={menuAbierto} onCloseAction={() => setMenuAbierto(false)} name={data.clienteNombre} points={puntos} />

      <div className="min-h-screen px-5 pt-24 pb-8 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div className="rounded-3xl bg-amber/15 border border-amber/30 px-8 py-8 flex flex-col items-center gap-2">
            <Sparkles className="h-7 w-7 text-amber-dark" />
            <p className="text-6xl font-bold text-ink">{puntos}</p>
            <p className="text-xl text-ink-soft">puntos disponibles</p>
          </div>

          {pendings.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold text-ink">Tenés canjes pendientes de retirar</h2>
              <div className="flex flex-col gap-3">
                {pendings.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-rust/20 bg-rust/5 px-5 py-4 flex flex-col gap-3">
                    <div>
                      <p className="text-xl font-medium text-ink">{p.rewardTitle}</p>
                      <p className="text-lg text-ink-soft" suppressHydrationWarning>
                        {p.points} pts · canjeado el {formatDate(p.createdAt)}
                      </p>
                    </div>

                    {cancelId === p.id ? (
                      <div className="flex items-center gap-3">
                        <p className="text-lg text-ink flex-1">¿Seguro que querés cancelarlo?</p>
                        <button
                          onClick={() => cancelPending(p.id)}
                          className="rounded-xl bg-rust px-4 py-2 text-lg font-medium text-cream hover:bg-rust-dark transition-colors"
                        >
                          Sí, cancelar
                        </button>
                        <button
                          onClick={() => setCancelId(null)}
                          className="rounded-xl bg-ink/10 px-4 py-2 text-lg text-ink hover:bg-ink/15 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelId(p.id)}
                        className="self-start text-lg text-ink-soft underline hover:text-ink transition-colors"
                      >
                        Cancelar canje
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold text-ink">Podés canjear ahora</h2>
            {availables.length === 0 ? (
              <p className="text-xl text-ink-soft">Todavía no tenés puntos suficientes para ninguna recompensa.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {availables.map((r) => (
                  <Link
                    key={r.id}
                    href={`/mis-puntos/recompensas/${r.id}`}
                    className="rounded-2xl border border-sage/30 bg-sage/10 overflow-hidden flex items-center gap-4 hover:bg-sage/15 transition-colors"
                  >
                    <img src={r.imagenBase64} alt={r.nombre} className="w-24 h-24 object-cover shrink-0" />
                    <div className="flex-1 flex items-center justify-between pr-4 py-3">
                      <span className="text-xl font-medium text-ink">{r.nombre}</span>
                      <span className="text-lg font-semibold text-sage-dark">{r.costoPuntos} pts</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {blocked.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold text-ink">Seguí sumando puntos para desbloquear estas recompensas</h2>
              <div className="flex flex-col gap-3">
                {blocked.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-ink/10 bg-ink/5 overflow-hidden flex items-center gap-4 opacity-60">
                    <img src={r.imagenBase64} alt={r.nombre} className="w-24 h-24 object-cover shrink-0 grayscale" />
                    <div className="flex-1 flex items-center justify-between pr-4 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-ink-soft" />
                        <div>
                          <p className="text-xl font-medium text-ink">{r.nombre}</p>
                          <p className="text-lg text-ink-soft">Te faltan {r.costoPuntos - puntos} puntos</p>
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-ink-soft">{r.costoPuntos} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pt-4 border-t border-ink/10 flex flex-col items-center gap-2">
            <button
              onClick={handleDeleteClick}
              disabled={pendientes.length > 0}
              className="flex items-center gap-2 text-lg text-ink-soft underline hover:text-rust-dark transition-colors disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar mi perfil
            </button>
            {pendientes.length > 0 && (
              <p className="text-base text-ink-soft text-center">Primero tenés que retirar o cancelar tus canjes pendientes.</p>
            )}
          </section>
        </div>
      </div>

      {mostrarEliminar && <EliminarPerfilModal onCancel={() => setMostrarEliminar(false)} onConfirm={handleConfirmDelete} />}
    </>
  );
}
