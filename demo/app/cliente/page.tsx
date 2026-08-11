'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerShell, type CustomerTab } from '@/components/customer/customer-shell'
import { CustomerHome } from '@/components/customer/customer-home'
import { CustomerRewards } from '@/components/customer/customer-rewards'
import { CustomerHistory } from '@/components/customer/customer-history'
import { useCustomerUser, useHydrated, useStoreData } from '@/lib/use-store'

export default function CustomerPage() {
  const router = useRouter()
  const hydrated = useHydrated()
  const customer = useCustomerUser()
  const data = useStoreData()
  const [tab, setTab] = useState<CustomerTab>('home')

  useEffect(() => {
    if (hydrated && !customer) router.replace('/cliente/login')
  }, [hydrated, customer, router])

  const myActions = useMemo(
    () =>
      customer
        ? data.pointActions
            .filter((a) => a.customerId === customer.id)
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        : [],
    [data.pointActions, customer],
  )

  if (!hydrated || !customer) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <CustomerShell
      customer={customer}
      organization={data.organization}
      active={tab}
      onSelect={setTab}
    >
      {tab === 'home' && (
        <CustomerHome
          customer={customer}
          organization={data.organization}
          rewards={data.rewards}
          actions={myActions}
          onGoToRewards={() => setTab('rewards')}
        />
      )}
      {tab === 'rewards' && <CustomerRewards customer={customer} rewards={data.rewards} />}
      {tab === 'history' && (
        <CustomerHistory
          customer={customer}
          actions={data.pointActions}
          redemptions={data.redemptions}
          rewards={data.rewards}
        />
      )}
    </CustomerShell>
  )
}
