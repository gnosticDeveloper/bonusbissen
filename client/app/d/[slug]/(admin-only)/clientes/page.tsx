import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SearchParamsPaginationControls } from "@/components/search-params-pagination-controls";
import { Badge } from "@/components/ui/badge";
import { requireDashboardSession } from "@/lib/auth/session";
import { formatDate, formatNumber } from "@/lib/helpers/format";
import { cn } from "@/lib/helpers/utils";
import { getStorefrontCustomers } from "./actions";
import { CustomerSearch } from "./customer-search";
import {
  customerSortDirectionFrom,
  customerSortFrom,
  DEFAULT_CUSTOMER_SORT,
  DEFAULT_CUSTOMER_SORT_DIRECTION,
  firstDirectionFor,
  type CustomerSortDirection,
  type CustomerSortKey,
} from "./sorting";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CustomersPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawParams, session] = await Promise.all([params, searchParams, requireDashboardSession()]);

  const query = first(rawParams.query)?.trim() ?? "";
  const page = Math.max(0, Math.floor(Number(first(rawParams.page))) || 0);
  const sort = customerSortFrom(first(rawParams.sort));
  const direction = customerSortDirectionFrom(first(rawParams.dir), sort);

  // The list is scoped to the storefront selected at sign-in (the verified `sf` claim).
  const storefrontId = session.sf;
  const result = storefrontId ? await getStorefrontCustomers(storefrontId, { search: query, page, sort, direction }) : null;

  /** Href that sorts by `key`: flips the direction on the active column, and goes back to the first page. */
  const sortHref = (key: CustomerSortKey) => {
    const next: CustomerSortDirection = key !== sort ? firstDirectionFor(key) : direction === "asc" ? "desc" : "asc";
    const nextParams = new URLSearchParams();

    if (query) nextParams.set("query", query);
    if (key !== DEFAULT_CUSTOMER_SORT || next !== DEFAULT_CUSTOMER_SORT_DIRECTION) {
      nextParams.set("sort", key);
      nextParams.set("dir", next);
    }

    const base = `/d/${slug}/clientes`;
    return nextParams.size > 0 ? `${base}?${nextParams}` : base;
  };

  const sortableHead = (key: CustomerSortKey, label: string, className: string) => {
    const active = key === sort;
    const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <th scope="col" aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined} className={className}>
        <Link
          href={sortHref(key)}
          replace
          scroll={false}
          className="-mx-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1 font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {label}
          <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden="true" />
        </Link>
      </th>
    );
  };

  return (
    <main className="mx-auto flex min-h-0 w-full flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Clientes</h1>
          <p className="mt-2 text-sm leading-6 text-foreground/80">
            Clientes afiliados en este local, con su saldo y su actividad acá.
          </p>
        </header>

        {result ? <CustomerSearch initialQuery={query} /> : null}
      </div>

      {!result ? (
        <ErrorState
          icon={UsersRound}
          title="Elegí un local"
          description="Iniciá sesión eligiendo un local para ver sus clientes."
        />
      ) : !result.ok ? (
        <ErrorState title="No pudimos cargar los clientes" description={result.error} />
      ) : result.data.items.length === 0 ? (
        <>
          <EmptyState
            icon={UsersRound}
            title={query ? "No encontramos clientes" : "Todavía no hay clientes"}
            description={
              query ? "Probá con otro nombre, usuario o email." : "Cuando alguien se afilie en este local, lo vas a ver acá."
            }
          />
          {/* An out-of-range page still needs a way back. */}
          {page > 0 && result.data.totalPages > 0 ? (
            <SearchParamsPaginationControls page={page} totalPages={result.data.totalPages} className="mx-auto w-full max-w-xs" />
          ) : null}
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-240 text-left text-sm">
                <caption className="sr-only">
                  Clientes afiliados en este local{query ? ` que coinciden con «${query}»` : ""}. Los encabezados con enlace
                  permiten ordenar la lista.
                </caption>
                <thead className="border-b border-border bg-background/60 text-xs text-foreground/80">
                  <tr>
                    {sortableHead("name", "Cliente", "px-5 py-3")}
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Email
                    </th>
                    {sortableHead("balance", "Saldo", "px-4 py-3 text-right")}
                    {sortableHead("totalEarned", "Sumados", "px-4 py-3 text-right")}
                    {sortableHead("totalRedeemed", "Canjeados", "px-4 py-3 text-right")}
                    {sortableHead("lastActivityAt", "Último movimiento", "px-4 py-3")}
                    {sortableHead("joinedAt", "Se unió el", "px-5 py-3")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.items.map((customer) => (
                    <tr key={customer.id} className="transition-colors hover:bg-primary/5">
                      <th scope="row" className="max-w-56 px-5 py-4 font-normal">
                        <span className="block truncate font-medium">{customer.name}</span>
                        <span className="block truncate text-xs text-foreground/80">@{customer.username}</span>
                      </th>
                      <td className="px-4 py-4">
                        {customer.email ? (
                          <span className="flex items-center gap-2">
                            <span className="max-w-56 truncate">{customer.email}</span>
                            {customer.emailVerified ? null : (
                              <Badge tone="warning" className="shrink-0 text-[11px]">
                                Sin verificar
                              </Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-foreground/60">Sin email</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">{formatNumber(customer.balance)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-foreground/80">
                        {formatNumber(customer.totalEarned)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-foreground/80">
                        {formatNumber(customer.totalRedeemed)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-foreground/80">
                        {customer.lastActivityAt ? (
                          <time dateTime={customer.lastActivityAt}>{formatDate(customer.lastActivityAt)}</time>
                        ) : (
                          <span className="text-foreground/60">Sin actividad</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-foreground/80">
                        <time dateTime={customer.joinedAt}>{formatDate(customer.joinedAt)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-foreground/80" role="status">
              {formatNumber(result.data.totalElements)} {result.data.totalElements === 1 ? "cliente" : "clientes"}
            </p>
            {result.data.totalPages > 1 ? (
              <SearchParamsPaginationControls page={page} totalPages={result.data.totalPages} className="w-full max-w-xs" />
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}
