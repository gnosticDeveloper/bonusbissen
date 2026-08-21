"use client";

import { useModal } from "@/components/modal";
import CreateCustomerModal from "@/components/modals/customers/create-customer-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function CreateCustomerButton() {
  const { open } = useModal();
  return (
    <Button onClick={() => open(<CreateCustomerModal allowPoints={false} />, { title: "Registrar nuevo cliente", description: "" })}>
      <Plus className="size-4" /> Nuevo cliente
    </Button>
  );
}
