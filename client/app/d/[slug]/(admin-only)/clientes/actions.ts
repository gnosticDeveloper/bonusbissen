"use server";

import { dashboardRequest } from "@/lib/api";
import type { StorefrontCustomer } from "@/lib/types/customer";
import type { PagedResponse } from "@/lib/types/paging";
import type { CustomerSortDirection, CustomerSortKey } from "./sorting";

const CUSTOMER_PAGE_SIZE = 10;

type GetStorefrontCustomersOptions = {
  search?: string;
  page?: number;
  sort: CustomerSortKey;
  direction: CustomerSortDirection;
};

/** Customers affiliated through a storefront. Admin-only in the backend, which also checks the storefront's organization. */
export async function getStorefrontCustomers(storefrontId: string, { search, page = 0, sort, direction }: GetStorefrontCustomersOptions) {
  const params = new URLSearchParams();

  const term = search?.trim();
  if (term) params.append("search", term);
  params.append("page", String(page));
  params.append("size", String(CUSTOMER_PAGE_SIZE));
  params.append("sort", sort);
  params.append("dir", direction);

  return await dashboardRequest<PagedResponse<StorefrontCustomer>>(`/storefronts/${encodeURIComponent(storefrontId)}/users?${params.toString()}`, {
    cache: "no-store",
  });
}
