"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { PaginationControls } from "@/components/pagination-controls";

export function SearchParamsPaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
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

  useEffect(() => {
    if (page > 0) router.prefetch(getPageHref(page - 1));
    if (page < totalPages - 1) router.prefetch(getPageHref(page + 1));
  }, [page, pathname, router, searchParams, totalPages]);

  const handlePageChange = (nextPage: number) => {
    startTransition(() => router.replace(getPageHref(nextPage)));
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-xs">
      <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={isPending} />
    </div>
  );
}
