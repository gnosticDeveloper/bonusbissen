import Link from "next/link";
import { UserRoundGroup } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { requireDashboardSession } from "@/lib/auth/session";
import { formatDate, formatNumber } from "@/lib/helpers/format";
import { cn } from "@/lib/helpers/utils";
import type { StaffMember, StaffRole } from "@/lib/types/staff";
import { UserRole } from "@/lib/types/user";
import { getOrganizationStorefronts, getStaff } from "./actions";
import { AddCashierButton } from "./add-cashier";
import { RemoveStaffMemberButton } from "./remove-staff-member";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ROLE_LABELS: Record<StaffRole, string> = { [UserRole.ADMIN]: "Administrador", [UserRole.CASHIER]: "Cajero" };
const ROLE_ORDER: Record<StaffRole, number> = { [UserRole.ADMIN]: 0, [UserRole.CASHIER]: 1 };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function EmployeesPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawParams, session, staffResult, storefrontsResult] = await Promise.all([
    params,
    searchParams,
    requireDashboardSession(),
    getStaff(),
    getOrganizationStorefronts(),
  ]);

  const header = (
    <header className="max-w-2xl">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Organización</p>
      <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Empleados</h1>
      <p className="mt-2 text-sm leading-6 text-foreground/80">Quiénes trabajan en cada local de tu negocio y con qué rol.</p>
    </header>
  );

  if (!staffResult.ok) {
    return (
      <main className="mx-auto flex min-h-0 w-full flex-col gap-5 text-foreground">
        {header}
        <ErrorState title="No pudimos cargar el equipo" description={staffResult.error} />
      </main>
    );
  }

  // `GET /staff` also returns removed memberships; a re-added person would otherwise appear twice.
  const members = staffResult.data
    .filter((member) => member.active)
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const storefronts = storefrontsResult.ok ? storefrontsResult.data : [];
  const inactiveStorefrontIds = new Set(storefronts.filter((s) => !s.active).map((s) => s.id));
  const activeStorefronts = storefronts.filter((s) => s.active).map(({ id, name }) => ({ id, name }));

  // Filter options: the organization's storefronts, plus any assigned one the storefront read didn't return.
  const filterOptions = new Map(storefronts.map((s) => [s.id, s.name]));
  for (const member of members) for (const s of member.storefronts) if (!filterOptions.has(s.id)) filterOptions.set(s.id, s.name);

  const requestedFilter = first(rawParams.local);
  const filter = requestedFilter && filterOptions.has(requestedFilter) ? requestedFilter : null;
  const visible = filter ? members.filter((member) => member.storefronts.some((s) => s.id === filter)) : members;
  const countIn = (storefrontId: string) => members.filter((m) => m.storefronts.some((s) => s.id === storefrontId)).length;

  const base = `/d/${slug}/empleados`;
  const filterLink = (storefrontId: string | null, label: string, count: number) => {
    const active = storefrontId === filter;
    return (
      <li key={storefrontId ?? "all"}>
        <Link
          href={storefrontId ? `${base}?local=${encodeURIComponent(storefrontId)}` : base}
          replace
          scroll={false}
          aria-current={active ? "true" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:bg-foreground/10 hover:text-foreground",
          )}
        >
          {label}
          <span className="tabular-nums opacity-80">{formatNumber(count)}</span>
        </Link>
      </li>
    );
  };

  const defaultStorefrontId = session.sf && activeStorefronts.some((s) => s.id === session.sf) ? session.sf : null;

  return (
    <main className="mx-auto flex min-h-0 w-full flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        {header}
        {storefrontsResult.ok ? (
          <AddCashierButton
            storefronts={activeStorefronts}
            defaultStorefrontId={defaultStorefrontId}
            memberUserIds={members.map((m) => m.userId)}
          />
        ) : (
          <p role="status" className="max-w-xs text-sm text-foreground/80">
            No pudimos cargar los locales, así que por ahora no podés agregar cajeros. {storefrontsResult.error}
          </p>
        )}
      </div>

      {filterOptions.size > 1 ? (
        <nav aria-label="Filtrar por local">
          <ul className="flex flex-wrap gap-2">
            {filterLink(null, "Todos los locales", members.length)}
            {[...filterOptions].map(([id, name]) =>
              filterLink(id, `${name}${id === session.sf ? " (este local)" : ""}`, countIn(id)),
            )}
          </ul>
        </nav>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={UserRoundGroup}
          title={filter ? "Nadie trabaja en este local" : "Todavía no hay empleados"}
          description={filter ? "Agregá un cajero y elegí este local." : "Agregá un cajero para que pueda operar en un local."}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-left text-sm">
                <caption className="sr-only">
                  Empleados del negocio{filter ? ` que trabajan en ${filterOptions.get(filter)}` : ""}, con su rol y sus locales.
                </caption>
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
                      isSelf={member.userId === session.sub}
                      currentStorefrontId={session.sf}
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
    </main>
  );
}

function StaffRow({
  member,
  isSelf,
  currentStorefrontId,
  inactiveStorefrontIds,
}: {
  member: StaffMember;
  isSelf: boolean;
  currentStorefrontId: string | undefined;
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
        {member.storefronts.length === 0 ? (
          <span className="text-foreground/60">Sin locales asignados</span>
        ) : (
          <ul className="flex max-w-80 flex-wrap gap-1.5">
            {member.storefronts.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  s.id === currentStorefrontId ? "border-primary/40 bg-primary/10" : "border-border bg-background/60",
                )}
              >
                {s.name}
                {s.id === currentStorefrontId ? <span className="text-foreground/80"> · este local</span> : null}
                {inactiveStorefrontIds.has(s.id) ? <span className="text-foreground/80"> · desactivado</span> : null}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-foreground/80">
        <time dateTime={member.createdAt}>{formatDate(member.createdAt)}</time>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right">
        {isSelf ? null : <RemoveStaffMemberButton member={{ id: member.id, name: member.name, roleLabel }} />}
      </td>
    </tr>
  );
}
