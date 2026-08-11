'use client'

import { BrandLockup } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/input'
import { setAdminSession } from '@/lib/store'
import { useStoreData } from '@/lib/use-store'
import { ArrowLeft, ShieldCheck, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const router = useRouter()
  const { users } = useStoreData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const admin = users.find((u) => u.role === 'ADMIN')
  const employee = users.find((u) => u.role === 'EMPLOYEE')

  function loginAs(id: string) {
    setAdminSession(id)
    router.push('/admin')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!match) {
      setError('Email o contraseña incorrectos. Probá con uno de los accesos de demo de abajo.')
      return
    }
    loginAs(match.id)
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLockup size="lg" subtitle="Panel administrativo" />
          <p className="text-sm text-muted-foreground text-pretty">
            Ingresá con tus credenciales o usá uno de los accesos de demostración.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="tu@negocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <FieldError message={error} />
            <Button type="submit" size="lg" className="w-full">
              Iniciar sesión
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-2">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accesos de demostración
          </p>
          {admin ? (
            <button
              type="button"
              onClick={() => loginAs(admin.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{admin.name} · Dueña (ADMIN)</span>
                <span className="text-xs text-muted-foreground">{admin.email} · admin123</span>
              </span>
            </button>
          ) : null}
          {employee ? (
            <button
              type="button"
              onClick={() => loginAs(employee.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <UserRound className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{employee.name} · Empleado (EMPLOYEE)</span>
                <span className="text-xs text-muted-foreground">{employee.email} · empleado123</span>
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </main>
  )
}
