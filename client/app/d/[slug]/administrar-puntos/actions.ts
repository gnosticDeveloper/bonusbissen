"use server";

import { dashboardRequest } from "@/lib/api";
import { Customer } from "@/lib/types/customer";
import { PointAction } from "@/lib/types/dashboard";
import { PagedRequestFunction, PagedResponse } from "@/lib/types/paging";
import type { ActionResult } from "@/lib/api";

interface UserPointsAwardResponse {
  userName: string;
  pointsGranted: number;
}

export const grantPointsTo = async (id: string, points: number, note?: string, allowDebt = false): Promise<ActionResult<UserPointsAwardResponse>> => {
  return await dashboardRequest<UserPointsAwardResponse>("/users/grant", {
    method: "POST",
    body: JSON.stringify({ userId: id, points, note, allowDebt }),
    headers: { "Content-Type": "application/json" },
  });
};

export interface UpdateGrantRequest {
  points: number;
  note: string;
  allowDebt?: boolean;
}

export async function updateGrant(id: string, values: UpdateGrantRequest) {
  const res = await dashboardRequest<PointAction>(`/users/grant/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values }),
  });

  return res;
}

/**
 * Throws on failure instead of returning an `ActionResult`: it's a
 * `PagedRequestFunction`, and `Autocomplete` catches the error to show its own
 * message. Callers outside `Autocomplete` need a `try`/`catch`.
 */
export const getAllCustomers: PagedRequestFunction<Customer> = async ({ search, page, size }) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());

  if (search) params.append("search", search);

  const result = await dashboardRequest<PagedResponse<Customer>>(`/users?${params.toString()}`);

  if (!result.ok) throw new Error(result.error);
  return result.data;
};

export const getAllPointActions = async (id?: string): Promise<ActionResult<PointAction[]>> => {
  const params = new URLSearchParams();
  params.append("size", "10");
  if (id) params.append("of", id);
  return await dashboardRequest<PointAction[]>(`/users/grant/history?${params.toString()}`);
};
