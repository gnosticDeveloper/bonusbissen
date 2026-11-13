"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { PageTour } from "@/components/page-tour";
import { Spinner } from "@/components/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { storefrontCustomersSync, type StorefrontCustomer } from "@/lib/demo/actions";
import { useStaffSession } from "@/lib/demo/hooks";
import { formatDate, formatNumber } from "@/lib/helpers/format";
import { cn } from "@/lib/helpers/utils";

type SortKey = "name" | "joinedAt" | "balance" | "totalEarned" | "totalRedeemed" | "lastActivityAt";
type Direction = "asc" | "desc";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
/** Without an explicit direction, text sorts A→Z and numbers/dates start from the highest/newest. */
const firstDirectionFor = (key: SortKey): Direction => (key === "name" ? "asc" : "desc");

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function compare(a: StorefrontCustomer, b: StorefrontCustomer, key: SortKey): number {
  if (key === "name") return a.name.localeCompare(b.name, "es");
  if (key === "joinedAt" || key === "lastActivityAt") return Date.parse(a[key] ?? "") - Date.parse(b[key] ?? "") || 0;
  return a[key] - b[key];
}

export default function CustomersPage() {
  const { state, staff } = useStaffSession();
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: "joinedAt", direction: "desc" });
  const [page, setPage] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const customers = state ? storefrontCustomersSync(state) : null;

  const rows = useMemo(() => {
    if (!customers) return [];
    const term = normalize(query.trim());
    const filtered = term ? customers.filter((c) => normalize(`${c.name} ${c.username} ${c.email ?? ""}`).includes(term)) : customers;
    return [...filtered].sort((a, b) => (sort.direction === "asc" ? 1 : -1) * compare(a, b, sort.key));
  }, [customers, query, sort]);

  if (!state || !staff || !customers) return null;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(next: string) {
    setValue(next);
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setQuery(next);
      setPage(0);
      setSearching(false);
    }, DEBOUNCE_MS);
  }

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({ key, direction: key !== current.key ? firstDirectionFor(key) : current.direction === "asc" ? "desc" : "asc" }));
    setPage(0);
  };

  const sortableHead = (key: SortKey, label: string, className: string) => {
    const active = key === sort.key;
    const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

    return (
      <th scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined} className={className}>
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="-mx-1.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-1 font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {label}
          <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden="true" />
        </button>
      </th>
    );
  };

  return (
    <main className="mx-auto flex min-h-0 w-full flex-col gap-5 text-foreground">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="max-w-2xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">Gestión</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Clientes</h1>
          <p className="mt-2 text-sm leading-6 text-foreground/80">Clientes afiliados en este local, con su saldo y su actividad acá.</p>
        </header>

        <div role="search" className="relative w-full sm:max-w-sm" data-tour="customers-search">
          <Input
            type="text"
            value={value}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Buscar por nombre, usuario o email"
            aria-label="Buscar clientes"
            autoComplete="off"
            icon={<Search className="size-4" aria-hidden="true" />}
            className="pr-9"
          />
          {searching ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-label="Buscando">
              <Spinner />
            </span>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={query ? "No encontramos clientes" : "Todavía no hay clientes"}
          description={query ? "Probá con otro nombre, usuario o email." : "Cuando alguien se afilie en este local, lo vas a ver acá."}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-border bg-card" data-tour="customers-table">
            <div className="overflow-x-auto">
              <table className="w-full min-w-240 text-left text-sm">
                <caption className="sr-only">
                  Clientes afiliados en este local{query ? ` que coinciden con «${query}»` : ""}. Los encabezados con botón permiten ordenar la lista.
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
                  {visible.map((customer) => (
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
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-foreground/80">{formatNumber(customer.totalEarned)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-foreground/80">{formatNumber(customer.totalRedeemed)}</td>
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
              {formatNumber(rows.length)} {rows.length === 1 ? "cliente" : "clientes"}
            </p>
            {totalPages > 1 ? <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} className="w-full max-w-xs" /> : null}
          </div>
        </>
      )}

      <PageTour
        id="panel-customers"
        steps={[
          {
            target: "customers-table",
            title: "Quiénes se sumaron a este local",
            body: (
              <>
                <p>El saldo es el del programa completo; «Sumados» y «Canjeados» cuentan solo lo que pasó en este local.</p>
                <p>Tocá los encabezados para ordenar, por ejemplo por saldo o por último movimiento.</p>
              </>
            ),
          },
          {
            target: "customers-search",
            title: "Encontrá a un cliente",
            body: <p>Buscá por nombre, usuario o email. Los clientes nuevos que se afilien desde la app aparecen acá de inmediato.</p>,
          },
        ]}
      />
    </main>
  );
}
