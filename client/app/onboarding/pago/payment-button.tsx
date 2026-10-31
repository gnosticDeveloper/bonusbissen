"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PaymentButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Continuando…" : "Simular confirmación de pago"}</Button>;
}
