"use server";

import { apiFetch } from "@/lib/api";
import { Customer } from "@/lib/definitions";

type NewCustomer = {
  name: string;
  phone: string;
};

export async function createCustomer(newCustomer: NewCustomer): Promise<Customer> {
  const response = await apiFetch(
    "/customers",
    {
      method: "POST",
      body: JSON.stringify(newCustomer),
      headers: { "Content-Type": "application/json" },
    },
    { redirectTo: "/login", tokenKey: "employee_token" },
  );

  const data = await response.json();
  return data;
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
