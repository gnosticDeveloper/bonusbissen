"use server";

import { Customer } from "@/lib/definitions";
import { cookies } from "next/headers";

export type TopCustomer = {
  id: string;
  name: string;
  points: number;
  totalVisits: number;
};

// NOTE: this should only return the top 10 customers.
export async function getTopCustomers(): Promise<TopCustomer[]> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch("http://localhost:8080/api/customers/top", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

export async function createCustomer(formData: FormData): Promise<Customer> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch("http://localhost:8080/api/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const token = (await cookies()).get("bb_token")?.value;

  const response = await fetch(`http://localhost:8080/api/customers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error("No se pudo eliminar el cliente");
}
