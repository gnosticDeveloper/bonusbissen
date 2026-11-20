/**
 * Sort keys accepted by `GET /storefronts/{id}/users` (`STOREFRONT_USER_SORTS`
 * in the backend); anything else is a 400 there. Username and email are not
 * sortable server-side, so those columns have plain headers.
 */
export const CUSTOMER_SORT_KEYS = ["name", "joinedAt", "balance", "totalEarned", "totalRedeemed", "lastActivityAt"] as const;

export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];
export type CustomerSortDirection = "asc" | "desc";

/** Same defaults as the backend: newest members first. */
export const DEFAULT_CUSTOMER_SORT: CustomerSortKey = "joinedAt";
export const DEFAULT_CUSTOMER_SORT_DIRECTION: CustomerSortDirection = "desc";

export function customerSortFrom(value: string | undefined): CustomerSortKey {
  return CUSTOMER_SORT_KEYS.find((key) => key === value) ?? DEFAULT_CUSTOMER_SORT;
}

/** Without an explicit direction, text sorts A→Z and numbers/dates start from the highest/newest. */
export function firstDirectionFor(key: CustomerSortKey): CustomerSortDirection {
  return key === "name" ? "asc" : "desc";
}

export function customerSortDirectionFrom(value: string | undefined, key: CustomerSortKey): CustomerSortDirection {
  return value === "asc" || value === "desc" ? value : firstDirectionFor(key);
}
