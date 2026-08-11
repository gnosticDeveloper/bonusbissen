'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell, type AdminTab } from '@/components/admin/admin-shell'
import { PointsAdmin } from '@/components/admin/points-admin'
import { RedemptionValidation } from '@/components/admin/redemption-validation'
import { RewardsManager } from '@/components/admin/rewards-manager'
import { CustomersManager } from '@/components/admin/customers-manager'
import { OrganizationSettings } from '@/components/admin/organization-settings'
import { useAdminUser, useHydrated, useStoreData } from '@/lib/use-store'

export default function AdminPage() {
  const router = useRouter()
  const hydrated = useHydrated()
  const user = useAdminUser()
  const { organization } = useStoreData()
  const [tab, setTab] = useState<AdminTab>('points')

  useEffect(() => {
    if (hydrated && !user) router.replace('/admin/login')
  }, [hydrated, user, router])

  // Guard employee from admin-only tab.
  useEffect(() => {
    if (user?.role === 'EMPLOYEE' && tab === 'organization') setTab('points')
  }, [user, tab])

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <AdminShell user={user} active={tab} onSelect={setTab}>
      {tab === 'points' && <PointsAdmin user={user} />}
      {tab === 'redemptions' && <RedemptionValidation user={user} />}
      {tab === 'rewards' && <RewardsManager user={user} />}
      {tab === 'customers' && <CustomersManager user={user} />}
      {tab === 'organization' && user.role === 'ADMIN' && (
        <OrganizationSettings organization={organization} />
      )}
    </AdminShell>
  )
}
