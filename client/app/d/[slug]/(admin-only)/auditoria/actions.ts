"use server";

import { dashboardRequest } from "@/lib/api";
import type { ActionResult } from "@/lib/action-result";
import type { PagedResponse, SearchOptions } from "@/lib/definitions";
import { auditQuery } from "@/lib/helpers/traceability";
import type { AuditFilters, AuditRecord, AuditUser } from "@/lib/types/traceability";

type StaffMember = { userId: string; name: string; username: string };

export async function getAuditRecords(filters: AuditFilters): Promise<ActionResult<AuditRecord[]>> {
  const query = auditQuery(filters);
  if (!query) return { ok: false, error: "Elegí al menos un filtro para consultar la auditoría." };
  return dashboardRequest<AuditRecord[]>(`/traceability?${query}`, { cache: "no-store" });
}

export async function searchAuditUsers({ search, size }: SearchOptions): Promise<PagedResponse<AuditUser>> {
  // Both actors and recipients can be customers or staff. Staff IDs identify
  // memberships, whereas the traceability endpoint requires their user IDs.
  const params = new URLSearchParams({ search, page: "0", size: String(size) });
  const [customers, staff] = await Promise.all([
    dashboardRequest<PagedResponse<AuditUser>>(`/users?${params}`, { cache: "no-store" }),
    dashboardRequest<StaffMember[]>("/staff", { cache: "no-store" }),
  ]);
  if (!customers.ok || !staff.ok) throw new Error("No se pudieron buscar los usuarios.");

  const query = search.trim().toLocaleLowerCase("es-AR");
  const staffMatches = staff.data
    .filter((user) => `${user.name} ${user.username}`.toLocaleLowerCase("es-AR").includes(query))
    .map((user) => ({ id: user.userId, name: user.name, username: user.username }));
  const items = [...new Map([...staffMatches, ...customers.data.items].map((user) => [user.id, user])).values()];
  // Autocomplete only requests the first page. Preserve all matching staff
  // alongside that customer page so neither group hides the other.
  return { items, page: 0, size: items.length, totalElements: items.length, totalPages: items.length ? 1 : 0 };
}
