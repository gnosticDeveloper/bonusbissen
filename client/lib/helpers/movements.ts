import { monthOfYear } from "@/lib/helpers/format";
import type { MovementResponse } from "@/lib/types/movement";

export const MOVEMENT_FILTERS = [
  { value: "todo", label: "Todo" },
  { value: "sumas", label: "Sumas" },
  { value: "canjes", label: "Canjes" },
  { value: "ajustes", label: "Ajustes" },
] as const;

export type MovementFilter = (typeof MOVEMENT_FILTERS)[number]["value"];
type MovementCategory = Exclude<MovementFilter, "todo">;

/** Reads `?tipo=`; anything unknown shows every movement. */
export function parseMovementFilter(value: string | string[] | undefined): MovementFilter {
  return MOVEMENT_FILTERS.find((filter) => filter.value === value)?.value ?? "todo";
}

/** Expirations fold into "Ajustes": both are balance changes the customer didn't make. */
function movementCategory(type: MovementResponse["type"]): MovementCategory {
  switch (type) {
    case "earn":
      return "sumas";
    case "redeem":
      return "canjes";
    case "adjust":
    case "expire":
      return "ajustes";
  }
}

export function filterMovements(movements: MovementResponse[], filter: MovementFilter): MovementResponse[] {
  if (filter === "todo") return movements;
  return movements.filter((movement) => movementCategory(movement.type) === filter);
}

export type MovementMonth = { key: string; label: string; items: MovementResponse[] };

/** Groups by Argentina-time month, keeping the backend's order (newest first) inside and across groups. */
export function groupMovementsByMonth(movements: MovementResponse[]): MovementMonth[] {
  const groups = new Map<string, MovementMonth>();

  for (const movement of movements) {
    const month = monthOfYear(movement.createdAt) ?? { key: "unknown", label: "Fecha no disponible" };
    const group = groups.get(month.key);
    if (group) group.items.push(movement);
    else groups.set(month.key, { ...month, items: [movement] });
  }

  return [...groups.values()];
}
