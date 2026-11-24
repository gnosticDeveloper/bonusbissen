"use client";

import { useState, type ReactNode } from "react";
import { Autocomplete } from "@/components/autocomplete-input";
import PointActionList from "@/components/point-action-list";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { formatNumber } from "@/lib/helpers/format";
import type { CustomerOption as Customer } from "@/lib/demo/types";
import { searchCustomers as getAllCustomers } from "@/lib/demo/actions";
import { GrantPointsForm } from "./grant-points-form";

/**
 * Owns the selected customer shared by the grant form and the history list.
 * The static card header comes from the server page as `header`.
 */
export function PointsWorkspace({ header }: { header: ReactNode }) {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function refreshCustomerBalance({ id, username }: Customer) {
    try {
      const page = await getAllCustomers({ search: username, page: 0, size: 10 });
      const updated = page.items.find((customer) => customer.id === id);
      if (updated) setSelected((current) => (current?.id === id ? updated : current));
    } catch {
      // Don't replace the selected customer if the balance refresh fails.
    }
  }

  function handleGranted(customer: Customer) {
    setRefreshKey((key) => key + 1);
    void refreshCustomerBalance(customer);
  }

  return (
    <div className="grid min-h-0 gap-5 lg:grid-cols-5">
      <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[0_14px_40px_rgba(25,24,23,0.06)] lg:col-span-2">
        {header}

        <CardContent className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6" data-tour="grant-form">
          <div className="flex flex-col gap-2" data-tour="customer-search">
            <Label htmlFor="customer-search" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/80">
              Cliente
            </Label>
            <Autocomplete<Customer>
              inputId="customer-search"
              selected={selected}
              onSelect={setSelected}
              onClear={() => setSelected(null)}
              fetchFn={getAllCustomers}
              getId={(c) => c.id}
              displayKeys={["name", "username"]}
              badge={(c) => (c.points == null ? "Saldo no disponible" : `${formatNumber(c.points)} pts`)}
              placeholder="Buscar por nombre o email…"
            />
          </div>

          <GrantPointsForm customer={selected} onGranted={handleGranted} />
        </CardContent>
      </Card>

      <PointActionList selected={selected} refreshKey={refreshKey} onBalanceChanged={() => selected && void refreshCustomerBalance(selected)} />
    </div>
  );
}
