"use server";

import { ActionResult, runAction } from "@/lib/action-result";
import { apiServer } from "@/lib/api";
import { Customer } from "@/lib/types/customer";
import { PointAction } from "../../types";

interface CustomerPointsAward {
  customerName: string;
  pointsGranted: number;
}

export const grantPointsTo = async (id: string, points: number): Promise<ActionResult<CustomerPointsAward>> => {
  return runAction(async () => {
    const response = await apiServer("/customers/grant", {
      method: "POST",
      body: JSON.stringify({ customerId: id, points }),
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  });
};

interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const getAllCustomers = async (search: string, page: number, size: number): Promise<PagedResponse<Customer>> => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());

  if (search) params.append("search", search);

  const res = await apiServer(`/customers?${params.toString()}`);

  if (!res.ok) throw new Error("Hubo un error buscando los clientes.");

  return await res.json();
};

export const getAllPointActions = async (id?: string): Promise<PointAction[]> => {
  const params = new URLSearchParams();
  params.append("page", "10");
  if (id) params.append("of", id);
  const res = await apiServer(`/customers/grant/history?${params.toString()}`);

  if (!res.ok) throw new Error("Hubo un error buscando el historial de puntos.");

  return await res.json();
};
