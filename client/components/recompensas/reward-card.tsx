"use client";

import { useState } from "react";
import { Gift, ImageOff, Percent, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import type { Reward } from "@/lib/definitions";
import { EmployeeRole, useAuth } from "@/providers/auth-provider";
import { deleteReward, updateReward } from "@/app/rewards.actions";
import Form from "next/form";
import ImageDropzone from "./image-dropzone";
import Modal from "@/components/modal";

export default function RewardCard({ r }: { r: Reward }) {
  const isFree = r.discountValue === 100;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const employee = useAuth();

  if (!employee) return null;

  const handleDelete = async () => {
    setError(null);
    const { id } = r;

    try {
      setLoading(true);
      await deleteReward(id);
      setShowDeleteModal(false);
    } catch (error) {
      if (error instanceof Error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    try {
      await updateReward(r.id, formData);
      setShowEditModal(false);
    } catch (error) {
      if (error instanceof Error) setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-cream-dark/30 overflow-hidden flex gap-4 shrink-0">
      <div className="w-32 h-full shrink-0 bg-ink/5 flex items-center justify-center">
        {r.imagePath ? (
          <Image width={128} height={128} src={r.imagePath} alt={r.title} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-ink-soft" />
        )}
      </div>

      <div className="flex-1 py-4 pr-5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold text-ink">{r.title}</p>
          <span className="text-lg font-semibold text-amber-dark whitespace-nowrap">{r.costPoints} pts</span>
        </div>

        <p className="text-lg text-ink-soft">{r.description}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          {isFree ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-3 py-1 text-base font-medium text-sage-dark">
              <Gift className="h-4 w-4" />
              Producto gratis
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rust/15 px-3 py-1 text-base font-medium text-rust-dark">
              <Percent className="h-4 w-4" />
              <p>|</p>
              {r.discountValue}% de descuento
            </span>
          )}

          {employee.type === "employee" && employee.user?.role === EmployeeRole.ADMIN ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-base font-medium text-rust-dark hover:bg-rust/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Borrar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showEditModal && (
        <Modal onCloseAction={() => setShowEditModal(false)} labelledBy="edit-reward-title" className="w-full max-w-xl rounded-3xl bg-cream p-6 flex flex-col gap-4">
            <Form
              action={handleUpdate}
              className="rounded-2xl border border-ink/10 bg-cream-dark/30 p-6 flex flex-col gap-5"
            >
              <h3 id="edit-reward-title" className="text-2xl font-bold text-ink">Editar &quot;{r.title}&quot;</h3>

              <label className="flex flex-col gap-2">
                <span className="text-lg text-ink-soft">Título de la recompensa</span>
                <input
                  defaultValue={r.title}
                  type="text"
                  name="title"
                  required
                  placeholder="Ej: 10% off en Pizza Margherita"
                  className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
                />
              </label>

              <ImageDropzone initialImageUrl={r.imagePath} />

              <label className="flex flex-col gap-2">
                <span className="text-lg text-ink-soft">Descripción</span>
                <textarea
                  defaultValue={r.description}
                  name="description"
                  rows={3}
                  placeholder="Ej: Descuento aplicable al pagar en caja."
                  className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber resize-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-lg text-ink-soft">Puntos que cuesta</span>
                <input
                  defaultValue={r.costPoints}
                  name="costPoints"
                  type="number"
                  min={1}
                  required
                  placeholder="Ej: 100"
                  className="rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-lg text-ink-soft">Descuento aplicado (100% = producto gratis)</span>
                <div className="relative">
                  <input
                    defaultValue={r.discountValue}
                    name="discountValue"
                    type="number"
                    min={1}
                    max={100}
                    required
                    placeholder="Ej: 10"
                    className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-xl text-ink placeholder:text-ink-soft/70 outline-none focus:border-amber pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-ink-soft">%</span>
                </div>
              </label>

              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-full rounded-2xl bg-ink/10 px-6 py-3 text-xl text-ink hover:bg-ink/15 transition-colors"
                >
                  Cerrar
                </button>

                <button
                  type="submit"
                  className="flex flex-1 whitespace-nowrap items-center justify-center gap-2 rounded-xl bg-amber px-6 py-3 text-xl font-medium text-cream hover:bg-amber-dark transition-colors"
                >
                  <Pencil className="h-5 w-5" />
                  Editar recompensa
                </button>
              </div>
            </Form>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal onCloseAction={() => setShowDeleteModal(false)} labelledBy="delete-reward-title" className="w-full max-w-md rounded-3xl bg-cream p-6 flex flex-col gap-4">
          <h2 id="delete-reward-title" className="text-2xl font-bold text-ink">¿Borrar &quot;{r.title}&quot;?</h2>
          <p className="text-lg text-ink-soft">
            Esta recompensa va a dejar de estar disponible para los clientes. Los canjes que ya se hicieron con ella no se van a ver afectados.
            Podés reactivarla más adelante si hace falta.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 rounded-2xl bg-ink/10 px-6 py-3 text-xl text-ink hover:bg-ink/15 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              onClick={handleDelete}
              className="flex-1 rounded-2xl bg-rust px-6 py-3 text-xl font-semibold text-cream hover:bg-rust-dark transition-colors disabled:opacity-50"
            >
              {loading ? "Eliminando..." : "Confirmar"}
            </button>
          </div>
          {error && <p className="text-lg text-rust-dark">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
