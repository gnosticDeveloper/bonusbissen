'use client'

import { createSeedData } from './mock-data'
import type {
  Customer,
  Organization,
  PointAction,
  PointActionType,
  Redemption,
  Reward,
  StoreData,
} from './types'

const DATA_KEY = 'bb_store_v1'
const ADMIN_SESSION_KEY = 'bb_admin_user'
const CUSTOMER_SESSION_KEY = 'bb_customer_user'
const THEME_KEY = 'bb_theme'

let snapshotCache: StoreData | null = null

type Listener = () => void

const listeners = new Set<Listener>()

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function read(): StoreData {
  if (!isBrowser()) return createSeedData()
  const raw = sessionStorage.getItem(DATA_KEY)
  if (!raw) {
    const seed = createSeedData()
    sessionStorage.setItem(DATA_KEY, JSON.stringify(seed))
    return seed
  }
  try {
    return JSON.parse(raw) as StoreData
  } catch {
    const seed = createSeedData()
    sessionStorage.setItem(DATA_KEY, JSON.stringify(seed))
    return seed
  }
}

function write(data: StoreData): void {
  if (!isBrowser()) return
  sessionStorage.setItem(DATA_KEY, JSON.stringify(data))
  emit()
}

function emit(): void {
  snapshotCache = null // invalida el snapshot cacheado
  listeners.forEach((l) => l())
}

/* ---------- subscription (for useSyncExternalStore) ---------- */

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Ensure the store is seeded. Safe to call multiple times. */
export function ensureSeeded(): void {
  read()
}

/* ---------- ids ---------- */

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function makeRedemptionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `BON-${code}`
}

/* ---------- snapshot reads ---------- */

export function getData(): StoreData {
  if (!snapshotCache) {
    snapshotCache = read()
  }
  return snapshotCache
}

/* ---------- customers ---------- */

export function addCustomer(input: { name: string; phone: string; points: number }): Customer {
  const data = read()
  const customer: Customer = {
    id: makeId('cust'),
    name: input.name,
    phone: input.phone,
    points: Math.max(0, Math.round(input.points)),
    createdAt: new Date().toISOString(),
  }
  data.customers = [customer, ...data.customers]
  write(data)
  return customer
}

export function updateCustomer(id: string, input: { name: string; phone: string }): void {
  const data = read()
  data.customers = data.customers.map((c) =>
    c.id === id ? { ...c, name: input.name, phone: input.phone } : c,
  )
  write(data)
}

export function deleteCustomer(id: string): void {
  const data = read()
  data.customers = data.customers.filter((c) => c.id !== id)
  write(data)
}

/* ---------- point actions ---------- */

export function grantPoints(params: {
  customerId: string
  amount: number
  type: PointActionType
  note: string
  byUserId: string
  byUserName: string
}): void {
  const data = read()
  const customer = data.customers.find((c) => c.id === params.customerId)
  if (!customer) return
  const newPoints = Math.max(0, customer.points + params.amount)
  data.customers = data.customers.map((c) =>
    c.id === params.customerId ? { ...c, points: newPoints } : c,
  )
  const action: PointAction = {
    id: makeId('act'),
    customerId: params.customerId,
    customerName: customer.name,
    type: params.type,
    amount: params.amount,
    note: params.note,
    byUserId: params.byUserId,
    byUserName: params.byUserName,
    createdAt: new Date().toISOString(),
  }
  data.pointActions = [action, ...data.pointActions]
  write(data)
}

/** Edit a previously-granted point action, adjusting the customer's balance by the delta. */
export function editPointAction(params: {
  actionId: string
  newAmount: number
  note: string
  byUserId: string
  byUserName: string
}): void {
  const data = read()
  const action = data.pointActions.find((a) => a.id === params.actionId)
  if (!action) return
  const delta = params.newAmount - action.amount
  const customer = data.customers.find((c) => c.id === action.customerId)
  if (customer) {
    const newPoints = Math.max(0, customer.points + delta)
    data.customers = data.customers.map((c) =>
      c.id === action.customerId ? { ...c, points: newPoints } : c,
    )
  }
  data.pointActions = data.pointActions.map((a) =>
    a.id === params.actionId
      ? {
          ...a,
          amount: params.newAmount,
          type: 'edit',
          note: params.note,
          byUserId: params.byUserId,
          byUserName: params.byUserName,
          createdAt: new Date().toISOString(),
        }
      : a,
  )
  write(data)
}

/** Remove a previously-granted point action, reverting its effect on the balance. */
export function removePointAction(actionId: string): void {
  const data = read()
  const action = data.pointActions.find((a) => a.id === actionId)
  if (!action) return
  const customer = data.customers.find((c) => c.id === action.customerId)
  if (customer) {
    const newPoints = Math.max(0, customer.points - action.amount)
    data.customers = data.customers.map((c) =>
      c.id === action.customerId ? { ...c, points: newPoints } : c,
    )
  }
  data.pointActions = data.pointActions.filter((a) => a.id !== actionId)
  write(data)
}

/* ---------- rewards ---------- */

export function addReward(input: Omit<Reward, 'id'>): void {
  const data = read()
  data.rewards = [{ ...input, id: makeId('rew') }, ...data.rewards]
  write(data)
}

export function updateReward(id: string, input: Omit<Reward, 'id'>): void {
  const data = read()
  data.rewards = data.rewards.map((r) => (r.id === id ? { ...input, id } : r))
  write(data)
}

export function deleteReward(id: string): void {
  const data = read()
  data.rewards = data.rewards.filter((r) => r.id !== id)
  write(data)
}

/* ---------- redemptions ---------- */

/** Customer claims a reward: spends points and creates a pending redemption. */
export function claimReward(params: { customerId: string; rewardId: string }): Redemption | null {
  const data = read()
  const customer = data.customers.find((c) => c.id === params.customerId)
  const reward = data.rewards.find((r) => r.id === params.rewardId)
  if (!customer || !reward) return null
  if (customer.points < reward.pointsRequired) return null

  data.customers = data.customers.map((c) =>
    c.id === customer.id ? { ...c, points: c.points - reward.pointsRequired } : c,
  )
  const redemption: Redemption = {
    id: makeId('red'),
    code: makeRedemptionCode(),
    rewardId: reward.id,
    customerId: customer.id,
    claimedAt: new Date().toISOString(),
    status: 'pending',
    resolvedAt: null,
    resolvedByUserId: null,
    resolvedByUserName: null,
    pointsRefunded: null,
    pointsSpent: reward.pointsRequired,
  }
  data.redemptions = [redemption, ...data.redemptions]
  write(data)
  return redemption
}

export function confirmRedemption(params: {
  redemptionId: string
  byUserId: string
  byUserName: string
}): void {
  const data = read()
  data.redemptions = data.redemptions.map((r) =>
    r.id === params.redemptionId
      ? {
          ...r,
          status: 'confirmed',
          resolvedAt: new Date().toISOString(),
          resolvedByUserId: params.byUserId,
          resolvedByUserName: params.byUserName,
          pointsRefunded: null,
        }
      : r,
  )
  write(data)
}

export function cancelRedemption(params: {
  redemptionId: string
  refundPoints: boolean
  byUserId: string
  byUserName: string
}): void {
  const data = read()
  const redemption = data.redemptions.find((r) => r.id === params.redemptionId)
  if (!redemption) return
  if (params.refundPoints) {
    data.customers = data.customers.map((c) =>
      c.id === redemption.customerId ? { ...c, points: c.points + redemption.pointsSpent } : c,
    )
  }
  data.redemptions = data.redemptions.map((r) =>
    r.id === params.redemptionId
      ? {
          ...r,
          status: 'cancelled',
          resolvedAt: new Date().toISOString(),
          resolvedByUserId: params.byUserId,
          resolvedByUserName: params.byUserName,
          pointsRefunded: params.refundPoints,
        }
      : r,
  )
  write(data)
}

/* ---------- organization ---------- */

export function updateOrganization(org: Organization): void {
  const data = read()
  data.organization = org
  write(data)
}

/* ---------- sessions ---------- */

export function getAdminSession(): string | null {
  if (!isBrowser()) return null
  return sessionStorage.getItem(ADMIN_SESSION_KEY)
}

export function setAdminSession(userId: string | null): void {
  if (!isBrowser()) return
  if (userId) sessionStorage.setItem(ADMIN_SESSION_KEY, userId)
  else sessionStorage.removeItem(ADMIN_SESSION_KEY)
  emit()
}

export function getCustomerSession(): string | null {
  if (!isBrowser()) return null
  return sessionStorage.getItem(CUSTOMER_SESSION_KEY)
}

export function setCustomerSession(customerId: string | null): void {
  if (!isBrowser()) return
  if (customerId) sessionStorage.setItem(CUSTOMER_SESSION_KEY, customerId)
  else sessionStorage.removeItem(CUSTOMER_SESSION_KEY)
  emit()
}

/* ---------- theme ---------- */

export function getTheme(): 'light' | 'dark' {
  if (!isBrowser()) return 'light'
  return sessionStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: 'light' | 'dark'): void {
  if (!isBrowser()) return
  sessionStorage.setItem(THEME_KEY, theme)
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  emit()
}
