import { getBusinesses } from "@/app/b/actions";
import { Business } from "@/lib/definitions";
import { useEffect, useState } from "react";

export function useBusinesses({ size, city, page = 0 }: { size: number; city?: string | null; page?: number }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getBusinesses({ page, size, city: city ?? undefined }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setBusinesses(result.data.items);
        setTotalPages(result.data.totalPages);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [page, size, city]);

  return { businesses, totalPages, loading, error };
}
