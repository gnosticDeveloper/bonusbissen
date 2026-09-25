"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save, X } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { PointProgram } from "@/lib/types/point-program";
import { Storefront } from "@/lib/types/storefront";
import { FormState } from "@/app/d/types";
import { createPointProgram, updatePointProgram } from "@/app/d/[slug]/(admin-only)/mi-negocio/actions";

const initialState: FormState = { message: null, status: null };

function assignmentMap(pointPrograms: PointProgram[], excludeId?: string) {
  const map = new Map<string, string>();
  for (const pp of pointPrograms) {
    if (pp.id === excludeId) continue;
    for (const sf of pp.storefronts) map.set(sf.id, pp.name);
  }
  return map;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit" className="gap-1.5">
      <Save className="size-4" /> {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear programa"}
    </Button>
  );
}

export function PointProgramForm({
  pointProgram,
  pointPrograms,
  storefronts,
  onDone,
}: {
  pointProgram?: PointProgram;
  pointPrograms: PointProgram[];
  storefronts: Storefront[];
  onDone: () => void;
}) {
  const notify = useToast();
  const isEdit = !!pointProgram;
  const action = isEdit ? updatePointProgram.bind(null, pointProgram.id) : createPointProgram;
  const [state, formAction] = useActionState(action, initialState);
  const [active, setActive] = useState(pointProgram?.active ?? true);

  const originalIds = useMemo(() => pointProgram?.storefronts.map((s) => s.id) ?? [], [pointProgram]);
  const [selected, setSelected] = useState<Set<string>>(new Set(originalIds));
  const taken = useMemo(() => assignmentMap(pointPrograms, pointProgram?.id), [pointPrograms, pointProgram]);

  useEffect(() => {
    if (state.status === "success") onDone();
    if (state.status) notify(state.message!, state.status);
  }, [state, notify, onDone]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4" noValidate>
      <input type="hidden" name="active" value={active ? "true" : "false"} />
      {isEdit && <input type="hidden" name="originalStorefrontIds" value={originalIds.join(",")} />}

      <Field label="Nombre del programa" htmlFor="pp-name" required>
        <Input defaultValue={pointProgram?.name} id="pp-name" name="name" placeholder="Club Café Aurora" />
      </Field>

      <Field label="Nombre de la unidad" htmlFor="pp-unit">
        <Input defaultValue={pointProgram?.unitLabel ?? ""} id="pp-unit" name="unitLabel" placeholder="Ej. granos (opcional, por defecto 'puntos')" />
      </Field>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Sucursales</p>
        <div className="flex flex-col gap-1.5">
          {storefronts.map((sf) => {
            const isTaken = taken.has(sf.id);
            return (
              <label
                key={sf.id}
                className={`flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm ${
                  isTaken ? "opacity-50" : "cursor-pointer hover:bg-card"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="storefrontIds"
                    value={sf.id}
                    checked={selected.has(sf.id)}
                    disabled={isTaken}
                    onChange={() => toggle(sf.id)}
                    className="size-4 accent-primary"
                  />
                  {sf.name}
                </span>
                {isTaken && <span className="text-xs text-muted">ya en {taken.get(sf.id)}</span>}
              </label>
            );
          })}
        </div>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-primary" />
          Programa activo
        </label>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="gap-1.5">
          <X className="size-4" /> Cancelar
        </Button>
        <SubmitButton isEdit={isEdit} />
      </div>
    </form>
  );
}
