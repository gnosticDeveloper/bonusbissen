"use server";

import { apiFetch } from "@/lib/api";
import { ActionResult, runAction } from "@/lib/action-result";
import { Customer } from "@/lib/definitions";

type NewCustomer = {
  name: string;
  phone: string;
};

export async function createCustomer(newCustomer: NewCustomer): Promise<ActionResult<Customer>> {
  return runAction(async () => {
    const response = await apiFetch(
      "/customers",
      {
        method: "POST",
        body: JSON.stringify(newCustomer),
        headers: { "Content-Type": "application/json" },
      },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );
    return await response.json();
  });
}

export async function getCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const response = await apiFetch(`/customers/phone/${phone}`, {
    method: "GET",
  });

  if (!response.ok) return undefined;
  const data = await response.json();
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const response = await apiFetch(`/customers/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) throw new Error("No se pudo eliminar el cliente");
}

export async function reactivateCustomer(id: string): Promise<ActionResult<Customer>> {
  return runAction(async () => {
    const response = await apiFetch(
      `/customers/${id}/reactivate`,
      { method: "PATCH" },
      { redirectTo: "/login", tokenKey: "employee_token" },
    );
    return await response.json();
  });
}
