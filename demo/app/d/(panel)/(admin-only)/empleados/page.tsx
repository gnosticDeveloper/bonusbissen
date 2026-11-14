"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageTour } from "@/components/page-tour";
import { Badge } from "@/components/ui/badge";
import { useStaffSession } from "@/lib/demo/hooks";
import { managedOrg } from "@/lib/demo/store";
import { UserRole, type StaffMember, type StaffRole } from "@/lib/demo/types";
import { formatDate, formatNumber } from "@/lib/helpers/format";
import { cn } from "@/lib/helpers/utils";
import { AddCashierButton } from "./add-cashier";
import { RemoveStaffMemberButton } from "./remove-staff-member";

const ROLE_LABELS: Record<StaffRole, string> = { [UserRole.ADMIN]: "Administrador", [UserRole.CASHIER]: "Cajero" };
const ROLE_ORDER: Record<StaffRole, number> = { [UserRole.ADMIN]: 0, [UserRole.CASHIER]: 1 };

export default function EmployeesPage() {
  const { state, staff } = useStaffSession({ adminOnly: true });
  const [requestedFilter, setFilter] = useState<string | null>(null);

  if (!state || !staff) return null;

  const header = (
    <header className="max-w-2xl">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Organización</p>
      <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Empleados</h1>
      <p className="mt-2 text-sm leading-6 text-foreground/80">Quiénes trabajan en cada local de tu negocio y con qué rol.</p>
    </header>
  );

  const org = managedOrg(state);
  const storefronts = state.storefronts.filter((s) => s.orgId === org.id);
  const nameOf = (id: string) => storefronts.find((s) => s.id === id)?.name ?? "Local";
  const members = state.staff.filter((member) => member.active).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const inactiveStorefrontIds = new Set(storefronts.filter((s) => !s.active).map((s) => s.id));
  const activeStorefronts = storefronts.filter((s) => s.active).map(({ id, name }) => ({ id, name }));
  const filterOptions = new Map(storefronts.map((s) => [s.id, s.name]));

  const filter = requestedFilter && filterOptions.has(requestedFilter) ? requestedFilter : null;
  const visible = filter ? members.filter((member) => member.storefrontIds.includes(filter)) : members;
  const countIn = (storefrontId: string) => members.filter((m) => m.storefrontIds.includes(storefrontId)).length;

  const filterButton = (storefrontId: string | null, label: string, count: number) => {
    const active = storefrontId === filter;
    return (
      <li key={storefrontId ?? "all"}>
        <button
          type="button"
          onClick={() => setFilter(storefrontId)}
          aria-current={active ? "true" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:bg-foreground/10 hover:text-foreground",
          )}
        >
          {label}
          <span className="tabular-nums opacity-80">{formatNumber(count)}</span>
        </button>
      </li>
    );
  };

  const defaultStorefrontId = activeStorefronts.some((s) => s.id === staff.storefrontId) ? staff.storefrontId : null;

  return (
    <main className="mx-auto flex min-h-0 w-full flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <AddCashierButton storefronts={activeStorefronts} defaultStorefrontId={defaultStorefrontId} memberUserIds={members.map((m) => m.userId)} />
      </div>

      {filterOptions.size > 1 ? (
        <nav aria-label="Filtrar por local" data-tour="staff-filter">
          <ul className="flex flex-wrap gap-2">
            {filterButton(null, "Todos los locales", members.length)}
            {[...filterOptions].map(([id, name]) => filterButton(id, `${name}${id === staff.storefrontId ? " (este local)" : ""}`, countIn(id)))}
          </ul>
        </nav>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filter ? "Nadie trabaja en este local" : "Todavía no hay empleados"}
          description={filter ? "Agregá un cajero y elegí este local." : "Agregá un cajero para que pueda operar en un local."}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-card" data-tour="staff-table">
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <caption className="sr-only">Empleados del negocio{filter ? ` que trabajan en ${filterOptions.get(filter)}` : ""}, con su rol y sus locales.</caption>
                <thead className="border-b border-border bg-background/60 text-xs text-foreground/80">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Empleado
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Rol
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Locales
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      En el equipo desde
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((member) => (
                    <StaffRow
                      key={member.id}
                      member={member}
                      nameOf={nameOf}
                      isSelf={member.id === staff.member.id}
                      currentStorefrontId={staff.storefrontId}
                      inactiveStorefrontIds={inactiveStorefrontIds}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-foreground/80" role="status">
            {formatNumber(visible.length)} {visible.length === 1 ? "persona" : "personas"}
            {filter ? ` en ${filterOptions.get(filter)}` : " en el equipo"}
          </p>
        </>
      )}

      <PageTour
        id="panel-staff"
        steps={[
          {
            target: "staff-table",
            title: "Tu equipo",
            body: <p>Cada persona tiene un rol y uno o más locales asignados. Los administradores ven todo; los cajeros, solo las operaciones de su local.</p>,
          },
          {
            target: "add-cashier",
            title: "Sumá un cajero",
            body: (
              <>
                <p>
                  Buscá una cuenta existente de Bonus Bissen (por ejemplo, <strong>Tomás</strong>) y elegí el local que querés asignarle. Se suma al equipo al instante.
                </p>
                <p>Después podés cerrar sesión y entrar al panel con su usuario y contraseña (en la demo, <span className="font-mono">cliente123</span>).</p>
              </>
            ),
          },
          {
            target: "staff-filter",
            title: "Filtrá por local",
            body: <p>Mirá quién trabaja en cada sucursal.</p>,
          },
        ]}
      />
    </main>
  );
}

function StaffRow({
  member,
  nameOf,
  isSelf,
  currentStorefrontId,
  inactiveStorefrontIds,
}: {
  member: StaffMember;
  nameOf: (id: string) => string;
  isSelf: boolean;
  currentStorefrontId: string;
  inactiveStorefrontIds: Set<string>;
}) {
  const roleLabel = ROLE_LABELS[member.role] ?? member.role;

  return (
    <tr className="transition-colors hover:bg-primary/5">
      <th scope="row" className="max-w-64 px-5 py-4 font-normal">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{member.name}</span>
          {isSelf ? (
            <Badge tone="primary" className="shrink-0 text-[11px]">
              Vos
            </Badge>
          ) : null}
        </span>
        <span className="block truncate text-xs text-foreground/80">@{member.username}</span>
      </th>
      <td className="px-4 py-4">
        <Badge tone={member.role === UserRole.ADMIN ? "success" : "neutral"} className="text-xs">
          {roleLabel}
        </Badge>
      </td>
      <td className="px-4 py-4">
        {member.storefrontIds.length === 0 ? (
          <span className="text-foreground/60">Sin locales asignados</span>
        ) : (
          <ul className="flex max-w-80 flex-wrap gap-1.5">
            {member.storefrontIds.map((id) => (
              <li
                key={id}
                className={cn("rounded-md border px-2 py-0.5 text-xs", id === currentStorefrontId ? "border-primary/40 bg-primary/10" : "border-border bg-background/60")}
              >
                {nameOf(id)}
                {id === currentStorefrontId ? <span className="text-foreground/80"> · este local</span> : null}
                {inactiveStorefrontIds.has(id) ? <span className="text-foreground/80"> · desactivado</span> : null}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-foreground/80">
        <time dateTime={member.createdAt}>{formatDate(member.createdAt)}</time>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right">{isSelf ? null : <RemoveStaffMemberButton member={{ id: member.id, name: member.name, roleLabel }} />}</td>
    </tr>
  );
}
