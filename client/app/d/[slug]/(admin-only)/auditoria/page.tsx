"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Select } from "@base-ui/react/select";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ClipboardList,
  Coins,
  Gift,
  ListFilter,
  Loader2,
  LogOut,

  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  UserRoundPlus,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Autocomplete } from "@/components/autocomplete-input";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import type { SearchOptions } from "@/lib/definitions";
import { auditDetailLines, sortAuditRecords } from "@/lib/helpers/traceability";
import type { AuditRecord, AuditUser, OperationType } from "@/lib/types/traceability";
import { getAuditRecords, searchAuditUsers } from "./actions";

type OperationOption = { id: OperationType; label: string; description: string; icon: LucideIcon; color: string };
const OPERATIONS: OperationOption[] = [
  {
    id: "SESSION_REVOKE",
    label: "Revocación de sesiones",
    description: "Se cerraron todas las sesiones de un usuario",
    icon: LogOut,
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  {
    id: "STAFF_CREATE",
    label: "Alta de personal",
    description: "Se incorporó una cuenta existente al equipo",
    icon: UserRoundPlus,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    id: "USER_CREATE",
    label: "Creación de cuenta",
    description: "No disponible en la consulta por organización",
    icon: UserPlus,
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "POINTS_GRANT",
    label: "Movimiento de puntos",
    description: "Suma o resta de puntos",
    icon: Coins,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "POINTS_CORRECTION",
    label: "Corrección de puntos",
    description: "Ajuste de un movimiento anterior",
    icon: SlidersHorizontal,
    color: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  {
    id: "REWARD_CLAIM",
    label: "Solicitud de recompensa",
    description: "El cliente solicitó un canje",
    icon: Gift,
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    id: "EXCHANGE_VERIFY",
    label: "Verificación de canje",
    description: "Se verificó el código, sin confirmar la entrega",
    icon: ShieldCheck,
    color: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  },
  {
    id: "EXCHANGE_APPROVE",
    label: "Entrega de recompensa",
    description: "Se confirmó la entrega del canje",
    icon: BadgeCheck,
    color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  {
    id: "EXCHANGE_CANCEL",
    label: "Cancelación por el personal",
    description: "Canje cancelado, con o sin devolución de puntos",
    icon: XCircle,
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    id: "EXCHANGE_USER_CANCEL",
    label: "Cancelación por el cliente",
    description: "Canje cancelado con devolución de puntos",
    icon: X,
    color: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
  },
];
const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR");


function OperationBadge({ operation }: { operation: OperationOption }) {
  const Icon = operation.icon;
  return (
    <span className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${operation.color}`}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {operation.label}
    </span>
  );
}

function OperationChoice({ operation, inList = false }: { operation: OperationOption | null; inList?: boolean }) {
  const Icon = operation?.icon ?? ListFilter;
  const label = operation?.label ?? "Todos los tipos";
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${operation?.color ?? "bg-primary/10 text-foreground/80"}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-left">
        {inList ? <Select.ItemText className="block text-sm font-medium">{label}</Select.ItemText> : <span className="block text-sm font-medium">{label}</span>}
        <span className="mt-0.5 block text-xs leading-4 text-foreground/80">{operation?.description ?? "Incluye todas las operaciones disponibles"}</span>
      </span>
    </span>
  );
}

function OperationSelect({ selected, onChange }: { selected: OperationOption | null; onChange: (operation: OperationOption | null) => void }) {
  return (
    <Select.Root
      value={selected?.id ?? ""}
      onValueChange={(value) => onChange(OPERATIONS.find((operation) => operation.id === value) ?? null)}
      items={[{ value: "", label: "Todos los tipos" }, ...OPERATIONS.map((operation) => ({ value: operation.id, label: operation.label }))]}
    >
      <Select.Trigger
        id="audit-operation"
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70"
      >
        <Select.Value className="min-w-0">{() => <OperationChoice operation={selected} />}</Select.Value>
        <Select.Icon><ChevronDown className="size-4 shrink-0 text-foreground/80" aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start" alignItemWithTrigger={false} className="z-50">
          <Select.Popup className="w-(--anchor-width) max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-lg">
            <Select.List className="max-h-[min(24rem,var(--available-height))] overflow-y-auto p-1.5">
              {[null, ...OPERATIONS].map((operation) => (
                <Select.Item
                  key={operation?.id ?? "all"}
                  value={operation?.id ?? ""}
                  label={operation?.label ?? "Todos los tipos"}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 outline-none data-highlighted:bg-primary/10 data-selected:bg-primary/5"
                >
                  <OperationChoice operation={operation} inList />
                  <span className="size-4 shrink-0"><Select.ItemIndicator><Check className="size-4 text-foreground" aria-hidden="true" /></Select.ItemIndicator></span>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function UserIdentity({ user }: { user: AuditUser }) {
  return (
    <div className="min-w-0 space-y-0.5 wrap-break-word">
      <p className="font-medium">{user.name ?? user.username ?? "Usuario no disponible"}</p>
      {user.username && <p className="text-xs text-foreground/80">{user.username}</p>}
      {/*<details className="text-xs text-foreground/70">
        <summary className="cursor-pointer hover:text-foreground">Ver ID del usuario</summary>
        <span className="mt-1 block break-all font-mono">{user.id}</span>
      </details>*/}
    </div>
  );
}

function AuditHelp() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Cómo buscar</h3>
        <p>
          Elegí al menos un filtro: la tabla se actualiza automáticamente cada vez que seleccionás o quitás un valor. Buscá usuarios por nombre o email;
          ambos buscadores incluyen clientes y personal, incluso personal inactivo. Para filtrar por operación, elegí un tipo en el selector.
        </p>
        <p>
          Los filtros se combinan con «Y»: si elegís un usuario que realizó la operación y otro afectado, aparecen solo los registros que cumplen
          ambas condiciones. Usá «Quitar» para sacar un usuario, «Todos los tipos» para quitar el filtro de operación o «Limpiar filtros» para empezar de nuevo.
        </p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Cómo leer la tabla</h3>
        <p>
          Los registros aparecen del más reciente al más antiguo. La fecha y hora se muestran en horario de Argentina. «Realizó la operación» indica
          quién inició la acción; «Usuarios afectados» muestra sobre quiénes se realizó. En acciones del cliente, puede ser la misma persona en ambas
          columnas.
        </p>
        <p>
          Los colores, íconos y nombres identifican el tipo de operación. En «Detalle» podés leer el motivo, la recompensa o la sucursal cuando estén
          disponibles.
        </p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Puntos y canjes</h3>
        <p>
          Un importe con «+» suma puntos y uno negativo los resta. Una corrección indica la diferencia aplicada al movimiento original, no el saldo
          final. Solicitar una recompensa descuenta su costo; verificar el código no confirma la entrega. Confirmar la entrega no suma puntos. En una
          cancelación del personal, revisá si hubo devolución; si cancela el cliente, los puntos se devuelven.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">Tipos de operación</h3>
        <ul className="space-y-2">
          {OPERATIONS.map((operation) => (
            <li key={operation.id} className="space-y-1">
              <OperationBadge operation={operation} />
              <p>{operation.description}.</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Alcance de la auditoría</h3>
        <p>
          Esta página es de solo lectura y muestra registros disponibles de tu organización, no un historial completo de todas las acciones. «Creación
          de cuenta» existe en el sistema, pero no se incluye en esta consulta por organización.
        </p>
        <p>
          Los nombres corresponden a los datos actuales, no necesariamente a los del momento de la operación. Si un nombre ya no está disponible,
          lo indicamos en la tabla. La búsqueda no permite encontrar todas las cuentas eliminadas o clientes inactivos.
        </p>
        <p>
          El historial está sujeto a la retención configurada en el sistema. La consulta trae todos los resultados y la tabla los divide en páginas de
          20; usá filtros combinados para acotar búsquedas grandes.
        </p>
      </section>
    </div>
  );
}

export default function AuditPage() {
  const [originating, setOriginating] = useState<AuditUser | null>(null);
  const [affected, setAffected] = useState<AuditUser | null>(null);
  const [operation, setOperation] = useState<OperationOption | null>(null);
  const [records, setRecords] = useState<AuditRecord[] | null>(null);
  const [knownUsers, setKnownUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const requestId = useRef(0);
  const hasFilters = Boolean(originating || affected || operation);
  const totalPages = records ? Math.ceil(records.length / PAGE_SIZE) : 0;
  const visibleRecords = records?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];

  const fetchUsers = useCallback(
    async (options: SearchOptions) => {
      const result = await searchAuditUsers(options);
      const historical = knownUsers.filter((user) => normalize(`${user.name ?? ""} ${user.username ?? ""}`).includes(normalize(options.search)));
      return { ...result, items: [...new Map([...result.items, ...historical].map((user) => [user.id, user])).values()] };
    },
    [knownUsers],
  );

  useEffect(() => () => { requestId.current++; }, []);

  function changeFilters(nextOriginating: AuditUser | null, nextAffected: AuditUser | null, nextOperation: OperationOption | null) {
    setOriginating(nextOriginating);
    setAffected(nextAffected);
    setOperation(nextOperation);
    void loadRecords(nextOriginating, nextAffected, nextOperation);
  }

  function clearFilters() {
    changeFilters(null, null, null);
  }

  async function loadRecords(nextOriginating: AuditUser | null, nextAffected: AuditUser | null, nextOperation: OperationOption | null) {
    // Changing filters invalidates pending requests, even when all filters are cleared.
    const id = ++requestId.current;
    const nextHasFilters = Boolean(nextOriginating || nextAffected || nextOperation);
    setLoading(nextHasFilters);
    setError(null);
    setRecords(null);
    setPage(0);
    if (!nextHasFilters) return;
    try {
      const result = await getAuditRecords({ originatingUserId: nextOriginating?.id, affectedUserId: nextAffected?.id, operationType: nextOperation?.id });
      if (id !== requestId.current) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRecords(sortAuditRecords(result.data));
      setKnownUsers((current) => [
        ...new Map(
          [...current, ...result.data.flatMap((record) => [record.originatingUser, ...record.affectedUsers])].map((user) => [user.id, user]),
        ).values(),
      ]);
    } catch {
      if (id === requestId.current) setError("No pudimos consultar los registros. Probá de nuevo.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-0 w-full text-foreground">
      <header className="mb-7 lg:mb-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Programa de fidelización</p>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Auditoría</h1>
          <Tooltip
            type="modal"
            label="Cómo funciona la auditoría"
            title="Cómo consultar la auditoría"
            description="Una guía para entender los filtros, los movimientos y los canjes."
            content={<AuditHelp />}
          />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">
          Consultá quién realizó cada operación, a quién afectó y qué cambió en tu organización.
        </p>
      </header>

      <div className="grid min-h-0 gap-5">
        <Card className="rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10">
                <ListFilter className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block">Filtrar registros</span>
                <span className="mt-1 block text-xs font-normal text-foreground/80">Elegí al menos un filtro. Los filtros se combinan.</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="audit-originating" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
                    Quién realizó la operación
                  </Label>
                  <Autocomplete<AuditUser>
                    inputId="audit-originating"
                    selected={originating}
                    onSelect={(user) => changeFilters(user, affected, operation)}
                    onClear={() => changeFilters(null, affected, operation)}
                    fetchFn={fetchUsers}
                    getId={(user) => user.id}
                    displayKeys={["name", "username"]}
                    placeholder="Buscar por nombre o email…"
                  />
                  <p className="text-xs leading-5 text-foreground/80">La persona que inició la acción: puede ser un cliente o personal de una sucursal.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-affected" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
                    Usuario afectado
                  </Label>
                  <Autocomplete<AuditUser>
                    inputId="audit-affected"
                    selected={affected}
                    onSelect={(user) => changeFilters(originating, user, operation)}
                    onClear={() => changeFilters(originating, null, operation)}
                    fetchFn={fetchUsers}
                    getId={(user) => user.id}
                    displayKeys={["name", "username"]}
                    placeholder="Buscar por nombre o email…"
                  />
                  <p className="text-xs leading-5 text-foreground/80">La persona sobre la que se realizó la operación.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-operation" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
                    Tipo de operación
                  </Label>
                  <OperationSelect selected={operation} onChange={(value) => changeFilters(originating, affected, value)} />
                  <p className="text-xs leading-5 text-foreground/80">Elegí «Todos los tipos» para no filtrar por operación.</p>
                </div>
              </div>
              {operation?.id === "USER_CREATE" && (
                <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-foreground">
                  La creación de cuentas no se incluye en la auditoría por organización. Esta operación no va a devolver registros.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={clearFilters} disabled={!hasFilters}>
                  Limpiar filtros
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10">
                <ClipboardList className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block">Registros de auditoría</span>
                <span className="mt-1 block text-xs font-normal text-foreground/80">
                  Más recientes primero · Fecha y hora de Argentina · Solo lectura
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0" aria-busy={loading}>
            <div role="status" aria-live="polite" className="sr-only">
              {loading
                ? "Consultando los registros de auditoría."
                : records
                  ? `${records.length} registros encontrados. Página ${records.length ? page + 1 : 0} de ${totalPages}.`
                  : "Elegí los filtros para consultar."}
            </div>
            {error ? (
              <div role="alert" className="space-y-2 px-5 py-10 text-center sm:px-6">
                <p className="font-semibold">No pudimos consultar la auditoría</p>
                <p className="text-sm text-foreground/80">{error}</p>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => void loadRecords(originating, affected, operation)}>Reintentar</Button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-foreground/80">
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Buscando los registros de tu organización…
              </div>
            ) : records === null ? (
              <div className="space-y-2 px-5 py-12 text-center sm:px-6">
                <p className="font-semibold">Empezá por una búsqueda</p>
                <p className="text-sm text-foreground/80">Elegí un usuario o un tipo de operación. Los registros se muestran automáticamente.</p>
              </div>
            ) : records.length === 0 ? (
              <div className="space-y-2 px-5 py-12 text-center sm:px-6">
                <p className="font-semibold">No encontramos registros con estos filtros</p>
                <p className="text-sm text-foreground/80">Probá quitando un filtro o buscando otra persona u operación.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-240 text-left text-sm">
                    <caption className="sr-only">
                      Operaciones de tu organización que cumplen los filtros seleccionados, ordenadas de más reciente a más antigua.
                    </caption>
                    <thead className="border-b border-border bg-background/60 text-xs text-foreground/80">
                      <tr>
                        <th scope="col" className="px-5 py-4 font-semibold">
                          Fecha y hora
                        </th>
                        <th scope="col" className="px-4 py-4 font-semibold">
                          Operación
                        </th>
                        <th scope="col" className="px-4 py-4 font-semibold">
                          Realizó la operación
                        </th>
                        <th scope="col" className="px-4 py-4 font-semibold">
                          Usuarios afectados
                        </th>
                        <th scope="col" className="px-5 py-4 font-semibold">
                          Detalle
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visibleRecords.map((record) => {
                        const metadata = OPERATIONS.find((value) => value.id === record.operationType);
                        const validDate = !Number.isNaN(Date.parse(record.createdAt));
                        return (
                          <tr key={record.operationId} className="align-top transition-colors hover:bg-primary/5">
                            <td className="whitespace-nowrap px-5 py-5 text-xs">
                              {validDate ? (
                                <time dateTime={record.createdAt}>{dateFormatter.format(new Date(record.createdAt))}</time>
                              ) : (
                                "Fecha no disponible"
                              )}
                            </td>
                            <td className="px-4 py-5">{metadata ? <OperationBadge operation={metadata} /> : "Operación no disponible"}</td>
                            <td className="max-w-52 px-4 py-5">
                              <UserIdentity user={record.originatingUser} />
                            </td>
                            <td className="max-w-52 space-y-3 px-4 py-5">
                              {record.affectedUsers.length ? (
                                record.affectedUsers.map((user) => <UserIdentity key={user.id} user={user} />)
                              ) : (
                                <span className="text-foreground/80">Sin usuarios afectados</span>
                              )}
                            </td>
                            <td className="min-w-72 max-w-md px-5 py-5">
                              <ul className="space-y-1 wrap-break-word text-xs leading-5 text-foreground/80">
                                {auditDetailLines(record)?.map((line, index) => (
                                  <li key={index} className="whitespace-pre-wrap">
                                    {line}
                                  </li>
                                ))}
                              </ul>
                              {/*<details className="mt-3 text-xs text-foreground/80">
                                <summary className="cursor-pointer font-medium hover:text-foreground">Ver identificadores</summary>
                                <dl className="mt-2 space-y-2">
                                  {auditReferences(record).map((reference) => (
                                    <div key={reference.label}>
                                      <dt>{reference.label}</dt>
                                      <dd className="break-all font-mono text-[11px]">{reference.id}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </details>*/}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <nav
                  aria-label="Páginas de registros de auditoría"
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6"
                >
                  <p className="text-xs text-foreground/80">
                    Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, records.length)} de {records.length} registros · Página{" "}
                    {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={page === 0}>
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={page + 1 >= totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </nav>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
