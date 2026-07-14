"use server";

import { apiFetch } from "@/lib/api";
import { Customer } from "@/lib/definitions";

export async function createCustomer(formData: FormData): Promise<Customer> {

  const response = await apiFetch("/customers", {
    method: "POST",
    body: formData,
  });

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
