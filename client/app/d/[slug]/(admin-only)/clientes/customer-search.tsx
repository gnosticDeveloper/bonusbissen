"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/spinner";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;

/** Search box driven by the `query` search param; the server page does the fetching. */
export function CustomerSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const term = next.trim();

      if (term) params.set("query", term);
      else params.delete("query");
      // A new search starts from the first page.
      params.delete("page");

      startTransition(() => router.replace(params.size > 0 ? `${pathname}?${params}` : pathname));
    }, DEBOUNCE_MS);
  };

  return (
    <div role="search" className="relative w-full sm:max-w-sm">
      <Input
        type="text"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar por nombre, usuario o email"
        aria-label="Buscar clientes"
        autoComplete="off"
        icon={<Search className="size-4" aria-hidden="true" />}
        className="pr-9"
      />
      {isPending ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-label="Buscando">
          <Spinner />
        </span>
      ) : null}
    </div>
  );
}
