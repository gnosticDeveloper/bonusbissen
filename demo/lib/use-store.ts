'use client'

import { useSyncExternalStore } from 'react'
import {
  ensureSeeded,
  getAdminSession,
  getCustomerSession,
  getData,
  getTheme,
  subscribe,
} from './store'
import type { AdminUser, Customer, StoreData } from './types'

const EMPTY: StoreData = {
  users: [],
  customers: [],
  rewards: [],
  redemptions: [],
  pointActions: [],
  organization: { name: '', icon: '', hours: '', address: '', description: '' },
}

/** Reactive access to the full store. Returns empty data on the server / first paint. */
export function useStoreData(): StoreData {
  const isHydrated = useHydrated()
  const data = useSyncExternalStore(
    subscribe,
    () => {
      ensureSeeded()
      return getData()
    },
    () => EMPTY,
  )
  return isHydrated ? data : EMPTY
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function useAdminUser(): AdminUser | null {
  const data = useStoreData()
  const id = useSyncExternalStore(
    subscribe,
    () => getAdminSession(),
    () => null,
  )
  if (!id) return null
  return data.users.find((u) => u.id === id) ?? null
}

export function useCustomerUser(): Customer | null {
  const data = useStoreData()
  const id = useSyncExternalStore(
    subscribe,
    () => getCustomerSession(),
    () => null,
  )
  if (!id) return null
  return data.customers.find((c) => c.id === id) ?? null
}

export function useTheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribe,
    () => getTheme(),
    () => 'light',
  )
}
