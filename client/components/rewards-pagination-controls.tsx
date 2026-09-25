"use client";

import { useRouter, usePathname } from "next/navigation";
import { PaginationControls } from "@/components/pagination-controls";

export function RewardsPaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams();
    if (nextPage > 0) params.set("page", String(nextPage));

    router.push(params.size > 0 ? `${pathname}?${params}` : pathname);
  };

  return <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} className="mt-6 pb-12" />;
}
