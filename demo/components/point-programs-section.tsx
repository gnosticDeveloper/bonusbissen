"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Award, Pencil, Plus, Save, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { createPointProgram, updatePointProgram } from "@/lib/demo/actions";
import { POINT_EXPIRATION_MONTHS, type PointExpirationMonths, type PointProgram, type Storefront } from "@/lib/demo/types";

type FormState = { message: string | null; status: "success" | "error" | null };
const initialState: FormState = { message: null, status: null };

export function PointProgramsSection({ pointPrograms, storefronts }: { pointPrograms: PointProgram[]; storefronts: Storefront[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const activeStorefronts = storefronts.filter((s) => s.active);

  return (
    <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]" data-tour="programs-section">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-foreground">
            <Award className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block">Programas de puntos</span>
            <span className="mt-1 block text-xs font-normal text-foreground/80">Cada sucursal corre un único programa.</span>
          </span>
        </CardTitle>
        <Button type="button" variant="ghost" className="gap-1.5" disabled={activeStorefronts.length === 0} onClick={() => setCreating((v) => !v)}>
          <Plus className="size-4" /> Agregar
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
        {activeStorefronts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">
            Cargá al menos una sucursal antes de crear un programa de puntos.
          </div>
        )}

        {creating && <PointProgramForm pointPrograms={pointPrograms} storefronts={activeStorefronts} onDone={() => setCreating(false)} />}

        {activeStorefronts.length > 0 && pointPrograms.length === 0 && !creating && (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-foreground/80">Todavía no creaste ningún programa de puntos.</div>
        )}

        {pointPrograms.map((pp) =>
          editingId === pp.id ? (
            <PointProgramForm key={pp.id} pointProgram={pp} storefronts={storefronts} pointPrograms={pointPrograms} onDone={() => setEditingId(null)} />
          ) : (
            <PointProgramCard key={pp.id} pointProgram={pp} storefronts={storefronts} onEdit={() => setEditingId(pp.id)} />
          ),
        )}
      </CardContent>
    </Card>
  );
}

function PointProgramCard({ pointProgram, storefronts, onEdit }: { pointProgram: PointProgram; storefronts: Storefront[]; onEdit: () => void }) {
  const assigned = storefronts.filter((sf) => pointProgram.storefrontIds.includes(sf.id));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-foreground">
            <Award className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{pointProgram.name}</p>
            <p className="truncate text-xs text-foreground/80">
              {pointProgram.unitLabel ?? "puntos"}
              {!pointProgram.active && " · Inactivo"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={onEdit} aria-label={`Editar ${pointProgram.name}`}>
          <Pencil className="size-4" /> Editar
        </Button>
      </div>

      <p className="pl-12 text-xs text-foreground/80">
        {pointProgram.expirationMonths == null ? "Sin vencimiento" : `Vencimiento: ${pointProgram.expirationMonths} meses`}
      </p>

      <div className="flex flex-wrap gap-1.5 pl-12">
        {assigned.length === 0 ? (
          <span className="text-xs text-foreground/80">Sin sucursales asignadas</span>
        ) : (
          assigned.map((sf) => (
            <span key={sf.id} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
              {sf.name}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function assignmentMap(pointPrograms: PointProgram[], excludeId?: string) {
  const map = new Map<string, string>();
  for (const pp of pointPrograms) {
    if (pp.id === excludeId) continue;
    for (const id of pp.storefrontIds) map.set(id, pp.name);
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

function PointProgramForm({
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
  const [active, setActive] = useState(pointProgram?.active ?? true);
  const [selected, setSelected] = useState<Set<string>>(new Set(pointProgram?.storefrontIds ?? []));
  const taken = useMemo(() => assignmentMap(pointPrograms, pointProgram?.id), [pointPrograms, pointProgram]);

  const [, formAction] = useActionState(async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const rawExpiration = String(formData.get("expirationMonths") ?? "none");
    const expirationMonths = (rawExpiration === "none" ? null : Number(rawExpiration)) as PointExpirationMonths;
    const input = {
      name: String(formData.get("name") ?? ""),
      unitLabel: String(formData.get("unitLabel") ?? ""),
      storefrontIds: [...selected],
      active,
      // Updates always send the expiration explicitly, as the backend requires.
      expirationMonths: pointProgram ? expirationMonths : null,
    };
    const result = pointProgram ? await updatePointProgram(pointProgram.id, input) : await createPointProgram(input);
    const next: FormState = result.ok
      ? { status: "success", message: isEdit ? "El programa se actualizó." : "El programa se creó." }
      : { status: "error", message: result.error };
    if (next.status === "success") onDone();
    notify(next.message!, next.status!);
    return next;
  }, initialState);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4" noValidate>
      <Field label="Nombre del programa" htmlFor="pp-name" required>
        <Input defaultValue={pointProgram?.name} id="pp-name" name="name" placeholder="Club Café Aurora" />
      </Field>

      <Field label="Nombre de la unidad" htmlFor="pp-unit">
        <Input defaultValue={pointProgram?.unitLabel ?? ""} id="pp-unit" name="unitLabel" placeholder="Ej. granos (opcional, por defecto 'puntos')" />
      </Field>

      {pointProgram ? (
        <Field label="Vencimiento de puntos" htmlFor={`pp-expiration-${pointProgram.id}`}>
          <select
            id={`pp-expiration-${pointProgram.id}`}
            name="expirationMonths"
            defaultValue={pointProgram.expirationMonths ?? "none"}
            aria-describedby={`pp-expiration-help-${pointProgram.id}`}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-foreground/70"
          >
            <option value="none">Sin vencimiento</option>
            {POINT_EXPIRATION_MONTHS.map((months) => (
              <option key={months} value={months}>
                {months} meses
              </option>
            ))}
          </select>
          <p id={`pp-expiration-help-${pointProgram.id}`} className="text-xs leading-relaxed text-foreground/80">
            El vencimiento se calcula desde la fecha de acreditación. Al activar, también se aplica a los puntos anteriores sin fecha de vencimiento y no
            anulados, que podrían vencer de inmediato. Cambiar el plazo conserva las fechas ya asignadas. Desactivar quita los vencimientos aún no procesados,
            sin recuperar puntos ya vencidos.
          </p>
        </Field>
      ) : (
        <p className="text-xs text-foreground/80">El programa se crea sin vencimiento. Podés configurarlo al editarlo después de crearlo.</p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Sucursales</p>
        <div className="flex flex-col gap-1.5">
          {storefronts.map((sf) => {
            const isTaken = taken.has(sf.id);
            return (
              <label
                key={sf.id}
                className={`flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm ${isTaken ? "opacity-50" : "cursor-pointer hover:bg-card"}`}
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
                {isTaken && <span className="text-xs text-foreground/80">ya en {taken.get(sf.id)}</span>}
              </label>
            );
          })}
        </div>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm w-fit">
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
