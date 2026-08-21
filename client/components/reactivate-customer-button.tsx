"use client";

import { reactivateCustomer } from "@/app/dashboard/actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ReactivateButton({ customerId }: { customerId: string }) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await reactivateCustomer(customerId);
    });
  };

  return (
    <Button type="button" disabled={pending} onClick={handleClick}>
      {pending ? "Reactivando..." : "Reactivar cliente"}
    </Button>
  );
}
