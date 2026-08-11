'use client'

import { BrandLockup } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Card } from '@/components/ui/card'
import { formatPoints } from '@/lib/format'
import { setCustomerSession } from '@/lib/store'
import { useStoreData } from '@/lib/use-store'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CustomerLoginPage() {
  const router = useRouter()
  const { customers } = useStoreData()

  function loginAs(id: string) {
    setCustomerSession(id)
    router.push('/cliente')
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" subtitle="Programa de fidelización" />
          <p className="text-sm text-muted-foreground text-pretty">
            Elegí tu cuenta para ver tus puntos y recompensas. (Demo: seleccioná cualquier cliente).
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => loginAs(c.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {c.name
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-sm font-bold text-primary">{formatPoints(c.points)}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  puntos
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
          {customers.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No hay clientes cargados todavía.
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  )
}
