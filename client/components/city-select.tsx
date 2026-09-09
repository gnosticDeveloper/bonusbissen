"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Spinner } from "./spinner";
import { getLocations } from "@/app/b/actions";

interface CitySelectProps {
  value: string | null;
  onChange: (city: string | null) => void;
}

// TODO: should remove the re-fetch attempt to avoid fetching the locations every time the users open it.
// Or check if there's already data before trying the refetch.
export function CitySelect({ value, onChange }: CitySelectProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (!next || fetchedRef.current) return;

    // i'm just larping performance atp.
    if (cities?.length ?? 0 > 0) return;

    fetchedRef.current = true;
    setLoading(true);
    setError(false);
    const result = await getLocations();
    if (result.ok) {
      setCities(result.data.map((l) => l.name));
    } else {
      setError(true);
      fetchedRef.current = false; // permite reintentar en el próximo open
    }
    setLoading(false);
  }

  function handleSelect(city: string | null) {
    onChange(city);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground transition-colors duration-240"
      >
        <span>{value ?? "Todas las zonas"}</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        role="listbox"
        className={`absolute right-0 z-40 mt-2 w-45 origin-top-right rounded-2xl border border-border bg-card p-1.5 shadow-[0_14px_28px_#1b152015] transition-all duration-150 ease-out ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2.25 px-3 py-4 text-[11px] text-muted">
            <Spinner />
            <span>Buscando zonas...</span>
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-[11px] text-muted">No pudimos cargar las zonas :(</div>
        ) : (
          <>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => handleSelect(null)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-foreground transition-colors duration-240 hover:bg-background"
            >
              <span>Todas las zonas</span>
              {value === null && <Check size={13} className="text-primary" />}
            </button>
            {cities?.map((city) => (
              <button
                key={city}
                type="button"
                role="option"
                aria-selected={value === city}
                onClick={() => handleSelect(city)}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-foreground transition-colors duration-240 hover:bg-background"
              >
                <span>{city}</span>
                {value === city && <Check size={13} className="text-primary" />}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
