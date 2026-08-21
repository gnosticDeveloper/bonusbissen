"use client";

import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Customer } from "@/lib/definitions";
import { formatPoints, parsePositiveInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Coins, HandCoins, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import PointActionList from "@/components/point-action-list";
import CreateCustomerButton from "@/components/create-customer-button";
import { grantPointsTo } from "@/app/[orgId]/dashboard/actions";

const POINTS_PER_CURRENCY = 1000; // 1 punto por cada $1000 gastados
const MAX_SPEND = 10_000_000;
const MAX_POINTS = 1_000;

export default function PointsManagerPage() {
  const notify = useToast();
  const [mode, setMode] = useState<"spend" | "manual">("spend");

  const [selected, setSelected] = useState<Customer | null>(null);
  const [granting, setGranting] = useState(false);
  // TODO: Notes are not implemented yet in the backend database.
  const [note, setNote] = useState("");
  const [spend, setSpend] = useState("");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);

  const computedFromSpend = useMemo(() => {
    const n = parsePositiveInt(spend, { max: MAX_SPEND });
    return n ? Math.floor(n / POINTS_PER_CURRENCY) : 0;
  }, [spend]);

  function clearSelection() {
    setSelected(null);
    setSpend("");
    setManual("");
    setError(null);
  }

  async function submit() {
    console.log({ selectedCustomer: selected, computedFromSpend, mode, spend, manual });
    if (!selected) return;

    setGranting(true);
    setError(null);

    if (mode === "spend") {
      const amount = parsePositiveInt(spend, { max: MAX_SPEND });
      if (amount == null) {
        setError("Ingresá un monto gastado válido (número mayor a 0, sin decimales).");
        return;
      }
      const points = Math.floor(amount / POINTS_PER_CURRENCY);
      if (points <= 0) {
        setError(`El monto es muy bajo para sumar puntos (mínimo $${POINTS_PER_CURRENCY}).`);
        return;
      }
      const result = await grantPointsTo(selected.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        notify(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`, "success");
        setSpend("");
      } else {
        setError(result.error);
      }
    } else {
      const points = parsePositiveInt(manual, { max: MAX_POINTS });
      if (points == null) {
        setError("Ingresá una cantidad de puntos válida (número entero mayor a 0).");
        return;
      }
      const result = await grantPointsTo(selected.id, points);
      if (result.ok) {
        const { pointsGranted, customerName } = result.data;
        notify(`Se sumaron ${formatPoints(pointsGranted)} puntos a ${customerName}.`, "success");
        setManual("");
      } else {
        setError(result.error);
        notify("Ocurrió un error inesperado al intentar sumar los puntos", "error");
      }
    }
    setGranting(false);
  }

  const isNotValidAmount =
    ((Number(spend) < POINTS_PER_CURRENCY || Number(spend) > MAX_SPEND) && mode === "spend") ||
    ((Number(manual) <= 0 || Number(manual) > MAX_SPEND) && mode === "manual");

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Coins className="size-4 text-primary" /> Otorgar puntos
            </CardTitle>
            <CreateCustomerButton />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Cliente</Label>
              <CustomerAutocomplete selected={selected} onSelect={setSelected} onClear={clearSelection} />
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("spend")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  mode === "spend" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Wallet className="size-4" /> Por monto
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  mode === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <HandCoins className="size-4" /> Puntos manuales
              </button>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              {mode === "spend" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="spend">Monto gastado ($)</Label>
                  <Input
                    id="spend"
                    inputMode="numeric"
                    placeholder="Ej: 12000"
                    value={spend}
                    onChange={(e) => setSpend(e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Conversión: 1 punto por cada ${POINTS_PER_CURRENCY}. Sumará{" "}
                    <span className="font-semibold text-primary">{formatPoints(computedFromSpend)} puntos</span>.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manual">Puntos a sumar</Label>
                  <Input
                    id="manual"
                    inputMode="numeric"
                    placeholder="Ej: 100"
                    value={manual}
                    onChange={(e) => setManual(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Input id="note" maxLength={120} placeholder="Detalle del movimiento" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <FieldError message={error} />
              <Button type="submit" className="w-full" disabled={isNotValidAmount || granting}>
                Sumar puntos
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/*TODO: we may want to wrap this up within a Suspense boundary. */}
      <PointActionList />

      {/*{editing ? (
        <EditActionModal
          action={editing}
          user={user}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            notify(msg);
          }}
        />
      ) : null}*/}

      {/*<Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Eliminar movimiento de puntos"
        description="Se revertirá el efecto de este movimiento sobre el saldo del cliente."
      >
        {removing ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              ¿Seguro que querés eliminar el movimiento de{" "}
              <span className="font-semibold text-foreground">
                {removing.amount >= 0 ? "+" : ""}
                {formatPoints(removing.amount)} puntos
              </span>{" "}
              de {removing.customerName}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  removePointAction(removing.id);
                  notify("Movimiento eliminado y saldo corregido.");
                  setRemoving(null);
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>*/}
    </div>
  );
}

// function EditActionModal({
//   action,
//   user,
//   onClose,
//   onSaved,
// }: {
//   action: PointAction;
//   user: AdminUser;
//   onClose: () => void;
//   onSaved: (message: string) => void;
// }) {
//   const isNegative = action.amount < 0;
//   const [amount, setAmount] = useState(String(Math.abs(action.amount)));
//   const [note, setNote] = useState(action.note);
//   const [error, setError] = useState<string | null>(null);

//   function save() {
//     setError(null);
//     const n = parsePositiveInt(amount, { max: MAX_POINTS });
//     if (n == null) {
//       setError("Ingresá una cantidad de puntos válida (entero mayor a 0).");
//       return;
//     }
//     editPointAction({
//       actionId: action.id,
//       newAmount: isNegative ? -n : n,
//       note: note.trim() ? sanitizeText(note) : action.note,
//       byUserId: user.id,
//       byUserName: user.name,
//     });
//     onSaved("Movimiento actualizado y saldo recalculado.");
//   }

//   return (
//     <Modal open onClose={onClose} title="Editar movimiento de puntos" description={`Cliente: ${action.customerName}`}>
//       <div className="flex flex-col gap-4">
//         <div className="flex flex-col gap-1.5">
//           <Label htmlFor="edit-amount">Cantidad de puntos {isNegative ? "(se aplicará como resta)" : ""}</Label>
//           <Input id="edit-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
//         </div>
//         <div className="flex flex-col gap-1.5">
//           <Label htmlFor="edit-note">Nota</Label>
//           <Textarea id="edit-note" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
//         </div>
//         <FieldError message={error} />
//         <div className="flex justify-end gap-2">
//           <Button variant="outline" onClick={onClose}>
//             Cancelar
//           </Button>
//           <Button onClick={save}>Guardar cambios</Button>
//         </div>
//       </div>
//     </Modal>
//   );
// }
