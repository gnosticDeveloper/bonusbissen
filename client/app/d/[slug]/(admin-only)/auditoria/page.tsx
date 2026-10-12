"use client";

import { useCallback, useRef, useState, type SubmitEvent } from "react";
import {
  BadgeCheck, ClipboardList, Coins, Gift, ListFilter, Loader2, LogOut,
  Search, ShieldCheck, SlidersHorizontal, UserPlus, UserRoundPlus, X, XCircle,
  type LucideIcon,
} from "lucide-react";
import { Autocomplete } from "@/components/autocomplete-input";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import type { SearchOptions } from "@/lib/definitions";
import { auditDetailLines, auditReferences, sortAuditRecords } from "@/lib/helpers/traceability";
import type { AuditRecord, AuditUser, OperationType } from "@/lib/types/traceability";
import { getAuditRecords, searchAuditUsers } from "./actions";

type OperationOption = { id: OperationType; label: string; description: string; icon: LucideIcon; color: string };
const OPERATIONS: OperationOption[] = [
  { id: "SESSION_REVOKE", label: "Revocación de sesiones", description: "Se cerraron todas las sesiones de un usuario", icon: LogOut, color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  { id: "STAFF_CREATE", label: "Alta de personal", description: "Se incorporó una cuenta existente al equipo", icon: UserRoundPlus, color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { id: "USER_CREATE", label: "Creación de cuenta", description: "No disponible en la consulta por organización", icon: UserPlus, color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  { id: "POINTS_GRANT", label: "Movimiento de puntos", description: "Suma o resta de puntos", icon: Coins, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { id: "POINTS_CORRECTION", label: "Corrección de puntos", description: "Ajuste de un movimiento anterior", icon: SlidersHorizontal, color: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  { id: "REWARD_CLAIM", label: "Solicitud de recompensa", description: "El cliente solicitó un canje", icon: Gift, color: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { id: "EXCHANGE_VERIFY", label: "Verificación de canje", description: "Se verificó el código, sin confirmar la entrega", icon: ShieldCheck, color: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300" },
  { id: "EXCHANGE_APPROVE", label: "Entrega de recompensa", description: "Se confirmó la entrega del canje", icon: BadgeCheck, color: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  { id: "EXCHANGE_CANCEL", label: "Cancelación por el personal", description: "Canje cancelado, con o sin devolución de puntos", icon: XCircle, color: "bg-red-500/10 text-red-700 dark:text-red-300" },
  { id: "EXCHANGE_USER_CANCEL", label: "Cancelación por el cliente", description: "Canje cancelado con devolución de puntos", icon: X, color: "bg-orange-500/10 text-orange-800 dark:text-orange-300" },
];
const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");

async function searchOperations({ search, page, size }: SearchOptions) {
  const matches = OPERATIONS.filter((operation) => normalize(`${operation.label} ${operation.description}`).includes(normalize(search)));
  return { items: matches.slice(page * size, (page + 1) * size), page, size, totalElements: matches.length, totalPages: Math.ceil(matches.length / size) };
}

function OperationBadge({ operation }: { operation: OperationOption }) {
  const Icon = operation.icon;
  return <span className={`inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${operation.color}`}><Icon className="size-4 shrink-0" aria-hidden="true" />{operation.label}</span>;
}

function UserIdentity({ user }: { user: AuditUser }) {
  return (
    <div className="min-w-0 space-y-0.5 wrap-break-word">
      <p className="font-medium">{user.name ?? user.username ?? "Usuario no disponible"}</p>
      {user.username && <p className="text-xs text-foreground/80">{user.username}</p>}
      <details className="text-xs text-foreground/70">
        <summary className="cursor-pointer hover:text-foreground">Ver ID del usuario</summary>
        <span className="mt-1 block break-all font-mono">{user.id}</span>
      </details>
    </div>
  );
}

function AuditHelp() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/80">
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Cómo buscar</h3>
        <p>Elegí al menos un filtro y presioná «Consultar registros». Buscá usuarios por nombre o email; ambos buscadores incluyen clientes y personal, incluso personal inactivo. Para ver los tipos de operación, hacé clic en el buscador o escribí su nombre.</p>
        <p>Los filtros se combinan con «Y»: si elegís un usuario que realizó la operación y otro afectado, aparecen solo los registros que cumplen ambas condiciones. Usá «Quitar» para sacar un filtro o «Limpiar filtros» para empezar de nuevo.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Cómo leer la tabla</h3>
        <p>Los registros aparecen del más reciente al más antiguo. La fecha y hora se muestran en horario de Argentina. «Realizó la operación» indica quién inició la acción; «Usuarios afectados» muestra sobre quiénes se realizó. En acciones del cliente, puede ser la misma persona en ambas columnas.</p>
        <p>Los colores, íconos y nombres identifican el tipo de operación. En «Detalle» podés leer el motivo, la recompensa o la sucursal cuando estén disponibles. Desplegá «Ver identificadores» para consultar los IDs de la operación y los movimientos relacionados.</p>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Puntos y canjes</h3>
        <p>Un importe con «+» suma puntos y uno negativo los resta. Una corrección indica la diferencia aplicada al movimiento original, no el saldo final. Solicitar una recompensa descuenta su costo; verificar el código no confirma la entrega. Confirmar la entrega no suma puntos. En una cancelación del personal, revisá si hubo devolución; si cancela el cliente, los puntos se devuelven.</p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">Tipos de operación</h3>
        <ul className="space-y-2">{OPERATIONS.map((operation) => <li key={operation.id} className="space-y-1"><OperationBadge operation={operation} /><p>{operation.description}.</p></li>)}</ul>
      </section>
      <section className="space-y-1">
        <h3 className="font-semibold text-foreground">Alcance de la auditoría</h3>
        <p>Esta página es de solo lectura y muestra registros disponibles de tu organización, no un historial completo de todas las acciones. «Creación de cuenta» existe en el sistema, pero no se incluye en esta consulta por organización.</p>
        <p>Los nombres corresponden a los datos actuales, no necesariamente a los del momento de la operación. Si falta información, mostramos el ID disponible. La búsqueda no permite encontrar todas las cuentas eliminadas o clientes inactivos.</p>
        <p>El historial está sujeto a la retención configurada en el sistema. La consulta trae todos los resultados y la tabla los divide en páginas de 20; usá filtros combinados para acotar búsquedas grandes.</p>
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

  const fetchUsers = useCallback(async (options: SearchOptions) => {
    const result = await searchAuditUsers(options);
    const historical = knownUsers.filter((user) => normalize(`${user.name ?? ""} ${user.username ?? ""}`).includes(normalize(options.search)));
    return { ...result, items: [...new Map([...result.items, ...historical].map((user) => [user.id, user])).values()] };
  }, [knownUsers]);

  function invalidateResults() {
    // Filters may change while a request is pending; never display stale results.
    requestId.current++;
    setRecords(null);
    setError(null);
    setLoading(false);
    setPage(0);
  }

  function clearFilters() {
    setOriginating(null);
    setAffected(null);
    setOperation(null);
    invalidateResults();
  }

  async function consult(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasFilters || loading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setRecords(null);
    setPage(0);
    try {
      const result = await getAuditRecords({ originatingUserId: originating?.id, affectedUserId: affected?.id, operationType: operation?.id });
      if (id !== requestId.current) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRecords(sortAuditRecords(result.data));
      setKnownUsers((current) => [...new Map([...current, ...result.data.flatMap((record) => [record.originatingUser, ...record.affectedUsers])].map((user) => [user.id, user])).values()]);
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
          <Tooltip type="modal" label="Cómo funciona la auditoría" title="Cómo consultar la auditoría" description="Una guía para entender los filtros, los movimientos y los canjes." content={<AuditHelp />} />
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/80">Consultá quién realizó cada operación, a quién afectó y qué cambió en tu organización.</p>
      </header>

      <div className="grid min-h-0 gap-5">
        <Card className="rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10"><ListFilter className="size-5" aria-hidden="true" /></span>
              <span><span className="block">Filtrar registros</span><span className="mt-1 block text-xs font-normal text-foreground/80">Elegí al menos un filtro. Los filtros se combinan con «Y».</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
            <form onSubmit={consult} className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="audit-originating" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Realizó la operación</Label>
                  <Autocomplete<AuditUser> inputId="audit-originating" selected={originating} onSelect={(user) => { setOriginating(user); invalidateResults(); }} onClear={() => { setOriginating(null); invalidateResults(); }} fetchFn={fetchUsers} getId={(user) => user.id} displayKeys={["name", "username"]} placeholder="Buscar por nombre o email…" />
                  <p className="text-xs leading-5 text-foreground/80">La persona que inició la acción: cliente o personal.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-affected" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Usuario afectado</Label>
                  <Autocomplete<AuditUser> inputId="audit-affected" selected={affected} onSelect={(user) => { setAffected(user); invalidateResults(); }} onClear={() => { setAffected(null); invalidateResults(); }} fetchFn={fetchUsers} getId={(user) => user.id} displayKeys={["name", "username"]} placeholder="Buscar por nombre o email…" />
                  <p className="text-xs leading-5 text-foreground/80">La persona sobre la que se realizó la operación.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-operation" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">Tipo de operación</Label>
                  <Autocomplete<OperationOption> inputId="audit-operation" selected={operation} onSelect={(value) => { setOperation(value); invalidateResults(); }} onClear={() => { setOperation(null); invalidateResults(); }} fetchFn={searchOperations} getId={(value) => value.id} displayKeys={["label", "description"]} placeholder="Elegí o buscá una operación…" minQueryLength={0} debounceMs={0} showPicture={false} />
                  <p className="text-xs leading-5 text-foreground/80">Dejá este filtro vacío para incluir todos los tipos.</p>
                </div>
              </div>
              {operation?.id === "USER_CREATE" && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-foreground">La creación de cuentas no se incluye en la auditoría por organización. Esta operación no va a devolver registros.</p>}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={clearFilters} disabled={!hasFilters}>Limpiar filtros</Button>
                <Button type="submit" className="rounded-xl" disabled={!hasFilters || loading}>{loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Search className="size-4" aria-hidden="true" />}{loading ? "Consultando…" : "Consultar registros"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)]">
          <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
            <CardTitle className="flex items-center gap-3 text-base tracking-[-0.02em]">
              <span className="grid size-10 place-items-center rounded-2xl bg-primary/10"><ClipboardList className="size-5" aria-hidden="true" /></span>
              <span><span className="block">Registros de auditoría</span><span className="mt-1 block text-xs font-normal text-foreground/80">Más recientes primero · Fecha y hora de Argentina · Solo lectura</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0" aria-busy={loading}>
            <div role="status" aria-live="polite" className="sr-only">{loading ? "Consultando los registros de auditoría." : records ? `${records.length} registros encontrados. Página ${records.length ? page + 1 : 0} de ${totalPages}.` : "Elegí los filtros para consultar."}</div>
            {error ? (
              <div role="alert" className="space-y-2 px-5 py-10 text-center sm:px-6"><p className="font-semibold">No pudimos consultar la auditoría</p><p className="text-sm text-foreground/80">{error}</p><p className="text-sm text-foreground/80">Volvé a presionar «Consultar registros» para reintentar.</p></div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-foreground/80"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Buscando los registros de tu organización…</div>
            ) : records === null ? (
              <div className="space-y-2 px-5 py-12 text-center sm:px-6"><p className="font-semibold">Empezá por una búsqueda</p><p className="text-sm text-foreground/80">Elegí un usuario o un tipo de operación y presioná «Consultar registros».</p></div>
            ) : records.length === 0 ? (
              <div className="space-y-2 px-5 py-12 text-center sm:px-6"><p className="font-semibold">No encontramos registros con estos filtros</p><p className="text-sm text-foreground/80">Probá quitando un filtro o buscando otra persona u operación.</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-240 text-left text-sm">
                    <caption className="sr-only">Operaciones de tu organización que cumplen los filtros seleccionados, ordenadas de más reciente a más antigua.</caption>
                    <thead className="border-b border-border bg-background/60 text-xs text-foreground/80"><tr>
                      <th scope="col" className="px-5 py-4 font-semibold">Fecha y hora</th>
                      <th scope="col" className="px-4 py-4 font-semibold">Operación</th>
                      <th scope="col" className="px-4 py-4 font-semibold">Realizó la operación</th>
                      <th scope="col" className="px-4 py-4 font-semibold">Usuarios afectados</th>
                      <th scope="col" className="px-5 py-4 font-semibold">Detalle</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">{visibleRecords.map((record) => {
                      const metadata = OPERATIONS.find((value) => value.id === record.operationType);
                      const validDate = !Number.isNaN(Date.parse(record.createdAt));
                      return (
                        <tr key={record.operationId} className="align-top transition-colors hover:bg-primary/5">
                          <td className="whitespace-nowrap px-5 py-5 text-xs">{validDate ? <time dateTime={record.createdAt}>{dateFormatter.format(new Date(record.createdAt))}</time> : "Fecha no disponible"}</td>
                          <td className="px-4 py-5">{metadata ? <OperationBadge operation={metadata} /> : "Operación no disponible"}</td>
                          <td className="max-w-52 px-4 py-5"><UserIdentity user={record.originatingUser} /></td>
                          <td className="max-w-52 space-y-3 px-4 py-5">{record.affectedUsers.length ? record.affectedUsers.map((user) => <UserIdentity key={user.id} user={user} />) : <span className="text-foreground/80">Sin usuarios afectados</span>}</td>
                          <td className="min-w-72 max-w-md px-5 py-5">
                            <ul className="space-y-1 wrap-break-word text-xs leading-5 text-foreground/80">{auditDetailLines(record)?.map((line, index) => <li key={index} className="whitespace-pre-wrap">{line}</li>)}</ul>
                            <details className="mt-3 text-xs text-foreground/80"><summary className="cursor-pointer font-medium hover:text-foreground">Ver identificadores</summary><dl className="mt-2 space-y-2">{auditReferences(record).map((reference) => <div key={reference.label}><dt>{reference.label}</dt><dd className="break-all font-mono text-[11px]">{reference.id}</dd></div>)}</dl></details>
                          </td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
                <nav aria-label="Páginas de registros de auditoría" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
                  <p className="text-xs text-foreground/80">Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, records.length)} de {records.length} registros · Página {page + 1} de {totalPages}</p>
                  <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={page === 0}>Anterior</Button><Button type="button" variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page + 1 >= totalPages}>Siguiente</Button></div>
                </nav>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
