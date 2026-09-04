import Link from 'next/link'
import { ArrowLeft, Compass, Sparkles } from 'lucide-react'

import { BrandLockup } from '@/components/brand'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/helpers/utils'

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link href="/" aria-label="Volver al inicio">
          <BrandLockup size="md" />
        </Link>
        <span className="hidden text-sm text-muted-foreground sm:block">Bonus Bissen</span>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <div className="mb-8 flex items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span>Parece que tomaste un desvío</span>
          </div>

          <div className="relative mb-5">
            <span className="font-mono text-[clamp(7rem,24vw,13rem)] font-bold leading-none tracking-[-0.12em] text-primary/15">
              404
            </span>
            <Compass
              className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rotate-12 text-primary sm:size-20"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          <h1 className="max-w-xl text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Esta página no está en nuestro mapa
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            El enlace puede estar desactualizado o la página quizá se movió. Volvamos a un lugar conocido para que sigas explorando Bonus Bissen.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver al inicio
            </Link>
            <Link href="/mis-puntos/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Ir al acceso de clientes
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-muted-foreground sm:px-10">
        Fidelización simple, relaciones que perduran.
      </footer>
    </main>
  )
}
