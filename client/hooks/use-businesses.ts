import { getBusinesses } from "@/app/b/actions";
import { Business } from "@/lib/types/business";
import { PagedResponse } from "@/lib/types/paging";
import { useEffect, useState } from "react";

export function useBusinesses({ size, city, page = 0 }: { size: number; city?: string | null; page?: number }) {
  // The last page that loaded stays on screen while the next one loads.
  const [data, setData] = useState<PagedResponse<Business> | null>(null);
  const [finished, setFinished] = useState<{ key: string; ok: boolean } | null>(null);

  const requestKey = `${page}:${size}:${city ?? ""}`;

  useEffect(() => {
    let active = true;

    getBusinesses({ page, size, city: city ?? undefined })
      .then((result) => {
        if (!active) return;
        if (result.ok) setData(result.data);
        setFinished({ key: requestKey, ok: result.ok });
      })
      .catch(() => {
        if (active) setFinished({ key: requestKey, ok: false });
      });

    return () => {
      active = false;
    };
  }, [requestKey, page, size, city]);

  const loading = finished?.key !== requestKey;
  const error = !loading && !finished?.ok;

  return { businesses: data?.items ?? [], totalPages: data?.totalPages ?? 0, loading, error };
}
