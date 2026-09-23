"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PaginationControls } from "@/components/pagination-controls";

export function SearchParamsPaginationControls({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextPage > 0) params.set("page", String(nextPage));
    else params.delete("page");

    router.push(params.size > 0 ? `${pathname}?${params}` : pathname);
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-xs">
      <PaginationControls page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}
