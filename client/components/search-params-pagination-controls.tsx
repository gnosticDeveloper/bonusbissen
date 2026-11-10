"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { PaginationControls } from "@/components/pagination-controls";

/**
 * `PaginationControls` driven by the `page` search param: the server page reads
 * it, so navigating is a `replace` plus a prefetch of the neighbours. Every
 * other search param is preserved — dropping them would reset filters on paging.
 */
export function SearchParamsPaginationControls({
  page,
  totalPages,
  className = "mt-6",
}: {
  page: number;
  totalPages: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const getPageHref = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage > 0) params.set("page", String(nextPage));
    else params.delete("page");

    return params.size > 0 ? `${pathname}?${params}` : pathname;
  };

  const previousHref = page > 0 ? getPageHref(page - 1) : null;
  const nextHref = page < totalPages - 1 ? getPageHref(page + 1) : null;

  useEffect(() => {
    if (previousHref) router.prefetch(previousHref);
    if (nextHref) router.prefetch(nextHref);
  }, [previousHref, nextHref, router]);

  const handlePageChange = (nextPage: number) => {
    startTransition(() => router.replace(getPageHref(nextPage)));
  };

  return <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={isPending} className={className} />;
}
