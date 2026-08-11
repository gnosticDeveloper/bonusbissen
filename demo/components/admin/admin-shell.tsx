'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award,
  Building2,
  Coins,
  LogOut,
  Menu,
  QrCode,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { setAdminSession } from '@/lib/store'
import type { AdminUser, Role } from '@/lib/types'

export type AdminTab = 'points' | 'redemptions' | 'rewards' | 'customers' | 'organization'

interface NavItem {
  id: AdminTab
  label: string
  icon: typeof Coins
  roles: Role[]
}

const NAV: NavItem[] = [
  { id: 'points', label: 'Administrar puntos', icon: Coins, roles: ['ADMIN', 'EMPLOYEE'] },
  { id: 'redemptions', label: 'Validación de canjes', icon: QrCode, roles: ['ADMIN', 'EMPLOYEE'] },
  { id: 'rewards', label: 'Gestión de recompensas', icon: Award, roles: ['ADMIN', 'EMPLOYEE'] },
  { id: 'customers', label: 'Listado de clientes', icon: Users, roles: ['ADMIN', 'EMPLOYEE'] },
  { id: 'organization', label: 'Tu negocio', icon: Building2, roles: ['ADMIN'] },
]

export function AdminShell({
  user,
  active,
  onSelect,
  children,
}: {
  user: AdminUser
  active: AdminTab
  onSelect: (tab: AdminTab) => void
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = NAV.filter((n) => n.roles.includes(user.role))

  function handleLogout() {
    setAdminSession(null)
    router.push('/')
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelect(item.id)
              setMobileOpen(false)
            }}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="size-4" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-svh flex-col bg-muted/30 lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coins className="size-4" />
          </div>
          <span className="font-serif text-lg font-semibold text-foreground">Panel</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <Badge tone={user.role === 'ADMIN' ? 'primary' : 'neutral'}>
                {user.role === 'ADMIN' ? 'Administrador' : 'Empleado'}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
          <span className="font-serif text-base font-semibold text-foreground">Panel</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Cerrar sesión">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-serif text-base font-semibold text-foreground">
                {user.name}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{nav}</div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden h-16 items-center justify-between border-b border-border bg-card px-6 lg:flex">
          <h1 className="font-serif text-xl font-semibold text-foreground">
            {items.find((i) => i.id === active)?.label}
          </h1>
          <ThemeToggle />
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
