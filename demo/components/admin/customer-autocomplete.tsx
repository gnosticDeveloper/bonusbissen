'use client'

import { Input } from '@/components/ui/input'
import { formatPoints } from '@/lib/format'
import type { Customer } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

export function CustomerAutocomplete({
  customers,
  selected,
  onSelect,
  onClear,
}: {
  customers: Customer[]
  selected: Customer | null
  onSelect: (c: Customer) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const digitsQ = q.replace(/\D/g, '')
    return customers
      .filter((c) => {
        const nameHit = c.name.toLowerCase().includes(q)
        const phoneHit = digitsQ.length > 0 && c.phone.replace(/\D/g, '').includes(digitsQ)
        return nameHit || phoneHit
      })
      .slice(0, 6)
  }, [customers, query])

  function choose(c: Customer) {
    onSelect(c)
    setQuery('')
    setOpen(false)
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {selected.name
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')}
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
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-3.5" /> Quitar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar cliente por nombre o teléfono…"
          value={query}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIndex((i) => Math.min(i + 1, matches.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const c = matches[activeIndex]
              if (c) choose(c)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
      </div>

      {open && query.trim() && (
        <ul
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              No se encontraron clientes con “{query.trim()}”.
            </li>
          ) : (
            matches.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (blurTimeout.current) clearTimeout(blurTimeout.current)
                    choose(c)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                  )}
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    {formatPoints(c.points)} pts
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
