"use client";

import { useState } from "react";
import ExchangesList from "@/components/canjes/exchanges-list";
import VerificarCodigoForm from "@/components/canjes/verificar-codigo-form";
import { Exchange } from "@/lib/definitions";

export default function CanjesPanel({ initialExchanges }: { initialExchanges: Exchange[] }) {
  const [exchanges, setExchanges] = useState(initialExchanges);

  function handleEntregar(id: string) {
    setExchanges((prev) => prev.map((c) => (c.id === id ? { ...c, state: "approved" } : c)));
  }

  function handleAnular(id: string) {
    setExchanges((prev) => prev.map((c) => (c.id === id ? { ...c, state: "cancelled" } : c)));
  }

  return (
    <div className="flex gap-8">
      <VerificarCodigoForm exchanges={exchanges} onApproveAction={handleEntregar} onCancelAction={handleAnular} />
      <ExchangesList exchanges={exchanges} />
    </div>
  );
}
