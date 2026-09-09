"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/helpers/utils";
import { PagedRequestFunction } from "@/lib/definitions";

const DEFAULT_DEBOUNCE_MS = 250;
const DEFAULT_MIN_QUERY_LENGTH = 2;

export interface AutocompleteProps<T> {
  selected: T | null;
  onSelect: (item: T) => void;
  onClear: () => void;
  /** Función paginada que trae los resultados, misma firma que getAllCustomers. */
  fetchFn: PagedRequestFunction<T>;
  /** Identificador único de cada item (no todo T tiene necesariamente "id"). */
  getId: (item: T) => string | number;
  /** [línea principal, línea secundaria opcional]. Ej: ["name", "phone"]. */
  displayKeys: [keyof T, (keyof T)?];
  /** Contenido opcional destacado a la derecha (ej: puntos). */
  badge?: (item: T) => ReactNode;
  placeholder?: string;
  minQueryLength?: number;
  debounceMs?: number;
}

function getDisplayValue<T>(item: T, key?: keyof T): string {
  if (!key) return "";
  const value = item[key];
  return value === null || value === undefined ? "" : String(value);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Meta({ parts }: { parts: ReactNode[] }) {
  const visible = parts.filter((p) => p !== null && p !== undefined && p !== "");
  if (visible.length === 0) return null;
  return (
    <span className="truncate text-xs text-muted">
      {visible.map((part, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {part}
        </span>
      ))}
    </span>
  );
}

// cuando uno hace trabajar correctamente a claude pasan estos milagros: un componente reusable.
export function Autocomplete<T>({
  selected,
  onSelect,
  onClear,
  fetchFn,
  getId,
  displayKeys,
  badge,
  placeholder = "Buscar…",
  minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: AutocompleteProps<T>) {
  const [primaryKey, secondaryKey] = displayKeys;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [matches, setMatches] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const listboxId = useId();

  useEffect(() => {
    const q = query.trim();
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (q.length < minQueryLength) return;

    debounceTimeout.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const { items } = await fetchFn({ search: q, page: 0, size: 10 });
        if (requestId !== requestIdRef.current) return;
        setMatches(items);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError("No se pudo buscar. Probá de nuevo.");
        setMatches([]);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query, fetchFn, minQueryLength, debounceMs]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(0);

    if (value.trim().length < minQueryLength) {
      setMatches([]);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }
  }

  function choose(item: T) {
    onSelect(item);
    setQuery("");
    setMatches([]);
    setOpen(false);
  }

  if (selected) {
    const primary = getDisplayValue(selected, primaryKey);
    const secondary = getDisplayValue(selected, secondaryKey);

    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {getInitials(primary)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{primary}</span>
            <Meta parts={[secondary, badge?.(selected)]} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <X className="size-3.5" aria-hidden="true" /> Quitar
        </button>
      </div>
    );
  }

  const showDropdown = open && query.trim().length >= minQueryLength;
  const activeItem = matches[activeIndex];

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          className="pl-9 text-base text-foreground placeholder:text-muted/70"
          placeholder={placeholder}
          value={query}
          role="combobox"
          aria-expanded={showDropdown && matches.length > 0}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            showDropdown && activeItem ? `${listboxId}-${getId(activeItem)}` : undefined
          }
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
              if (activeItem) choose(activeItem);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>

      {showDropdown && (
        <ul
          id={listboxId}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-card shadow-sm"
          role="listbox"
        >
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Buscando…
            </li>
          ) : error ? (
            <li className="px-3 py-2.5 text-sm text-red-500">{error}</li>
          ) : matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">
              No se encontraron resultados con &quot;{query.trim()}&quot;.
            </li>
          ) : (
            matches.map((item, i) => {
              const id = getId(item);
              const primary = getDisplayValue(item, primaryKey);
              const secondary = getDisplayValue(item, secondaryKey);
              return (
                <li key={id} id={`${listboxId}-${id}`} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimeout.current) clearTimeout(blurTimeout.current);
                      choose(item);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      i === activeIndex ? "bg-primary/10" : "hover:bg-primary/5",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{primary}</span>
                      <Meta parts={[secondary]} />
                    </span>
                    {badge && (
                      <span className="shrink-0 text-xs font-semibold text-primary">{badge(item)}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
