"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useTransition } from "react";
import { PaginationControls } from "@/components/pagination-controls";

export function RewardsPaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const getPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (nextPage > 0) params.set("page", String(nextPage));
    return params.size > 0 ? `${pathname}?${params}` : pathname;
  };

  useEffect(() => {
    if (page > 0) router.prefetch(getPageHref(page - 1));
    if (page < totalPages - 1) router.prefetch(getPageHref(page + 1));
  }, [page, pathname, router, totalPages]);

  const handlePageChange = (nextPage: number) => {
    startTransition(() => router.replace(getPageHref(nextPage)));
  };

  return <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} disabled={isPending} className="mt-6 pb-12" />;
}
