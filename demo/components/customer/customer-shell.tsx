'use client'

import { useRouter } from 'next/navigation'
import { Gift, History, Home, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { setCustomerSession } from '@/lib/store'
import type { Customer, Organization } from '@/lib/types'
import Image from 'next/image'

export type CustomerTab = 'home' | 'rewards' | 'history'

const NAV: { id: CustomerTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'rewards', label: 'Premios', icon: Gift },
  { id: 'history', label: 'Historial', icon: History },
]

export function CustomerShell({
  customer,
  organization,
  active,
  onSelect,
  children,
}: {
  customer: Customer
  organization: Organization
  active: CustomerTab
  onSelect: (tab: CustomerTab) => void
  children: React.ReactNode
}) {
  const router = useRouter()

  function handleLogout() {
    setCustomerSession(null)
    router.push('/')
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-lg">
            {/*<span aria-hidden>{organization.icon || '★'}</span>*/}
            <Image src={organization.icon || '/placeholder.svg'} alt="logo" width={36} height={36} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-foreground">{organization.name}</p>
            <p className="text-xs text-muted-foreground">Hola, {customer.name.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={handleLogout}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-2 py-1.5 backdrop-blur">
        <div className="flex items-center justify-around">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('size-5', isActive && 'fill-primary/15')} />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
