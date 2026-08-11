export type Role = 'ADMIN' | 'EMPLOYEE'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  /** Simulated password, never a real credential. */
  password: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  points: number
  createdAt: string
}

export interface Reward {
  id: string
  title: string
  description: string
  /** Human-readable discount value, e.g. "20% OFF" or "$500". */
  discountValue: string
  pointsRequired: number
  imageUrl: string
}

export type RedemptionStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Redemption {
  id: string
  code: string
  rewardId: string
  customerId: string
  claimedAt: string
  status: RedemptionStatus
  resolvedAt: string | null
  resolvedByUserId: string | null
  resolvedByUserName: string | null
  /** For cancelled redemptions: whether the spent points were returned. */
  pointsRefunded: boolean | null
  /** Points that were required for the reward at claim time. */
  pointsSpent: number
}

export type PointActionType = 'add' | 'subtract' | 'edit' | 'remove'

export interface PointAction {
  id: string
  customerId: string
  customerName: string
  type: PointActionType
  /** Net points delta applied to the customer by this action. */
  amount: number
  /** Optional human context (e.g. amount spent, correction note). */
  note: string
  byUserId: string
  byUserName: string
  createdAt: string
}

export interface Organization {
  name: string
  icon: string
  hours: string
  address: string
  description: string
}

export interface StoreData {
  users: AdminUser[]
  customers: Customer[]
  rewards: Reward[]
  redemptions: Redemption[]
  pointActions: PointAction[]
  organization: Organization
}
