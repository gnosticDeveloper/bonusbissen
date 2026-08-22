"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Customer } from "@/lib/definitions";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAllCustomers } from "@/app/[orgId]/dashboard/actions";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function CustomerAutocomplete({
  selected,
  onSelect,
  onClear,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [matches, setMatches] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (q.length < MIN_QUERY_LENGTH) return;

    debounceTimeout.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const { items } = await getAllCustomers(q, 0, 10);
        if (requestId !== requestIdRef.current) return;
        setMatches(items.map((v) => ({ ...v, points: 0 })));
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("No se pudo buscar. Probá de nuevo.");
        setMatches([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(0);

    if (value.trim().length < MIN_QUERY_LENGTH) {
      setMatches([]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }

  function choose(c: Customer) {
    onSelect(c);
    setQuery("");
    setMatches([]);
    setOpen(false);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {selected.name
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{selected.name}</span>
            <span className="text-xs text-muted-foreground">
              {selected.phone} · {formatPoints(selected.points)} pts
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center cursor-pointer gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-red-500 hover:bg-background"
        >
          <X className="size-3.5" /> Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 text-lg text-ink placeholder:text-ink-soft/70"
          placeholder="Buscar cliente por nombre o teléfono…"
          value={query}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-autocomplete="list"
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const c = matches[activeIndex];
              if (c) choose(c);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {open && query.trim().length >= MIN_QUERY_LENGTH && (
        <ul className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover shadow-lg" role="listbox">
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Buscando…</li>
          ) : error ? (
            <li className="px-3 py-2.5 text-sm text-rust-dark">{error}</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">No se encontraron clientes con &quot;{query.trim()}&quot;.</li>
          ) : (
            matches.map((c, i) => (
              <li key={c.id} role="option" className="hover:bg-white/15 transition-colors cursor-pointer" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimeout.current) clearTimeout(blurTimeout.current);
                    choose(c);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">{formatPoints(c.points)} pts</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
