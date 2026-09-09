"use server";

import { ActionResult, runAction } from "@/lib/action-result";
import { request } from "@/lib/api";
import { Customer } from "@/lib/types/customer";
import { PointAction } from "../../types";
import { PagedRequestFunction, PagedResponse } from "@/lib/definitions";

interface CustomerPointsAward {
  customerName: string;
  pointsGranted: number;
}

export const grantPointsTo = async (id: string, points: number): Promise<ActionResult<CustomerPointsAward>> => {
  return runAction(async () => {
    const response = await request("/customers/grant", {
      method: "POST",
      body: JSON.stringify({ customerId: id, points }),
      headers: { "Content-Type": "application/json" },
    });

    return await response.json();
  });
};

export const getAllCustomers: PagedRequestFunction<Customer> = async ({ search, page, size }) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());

  if (search) params.append("search", search);

  const result = await request<PagedResponse<Customer>>(`/customers?${params.toString()}`);

  if (!result.ok) throw new Error(result.error);

  return result.data;
};

export const getAllPointActions = async (id?: string): Promise<PointAction[]> => {
  const params = new URLSearchParams();
  params.append("page", "10");
  if (id) params.append("of", id);
  const res = await request(`/customers/grant/history?${params.toString()}`);

  if (!res.ok) throw new Error("Hubo un error buscando el historial de puntos.");

  return await res.json();
};
