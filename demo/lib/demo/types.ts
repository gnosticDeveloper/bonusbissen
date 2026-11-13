/**
 * Demo data model. Everything lives in sessionStorage (see `store.ts`), so these
 * shapes mirror what the real backend exposes, flattened into one state object.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  USER = "USER",
}

export type StaffRole = UserRole.ADMIN | UserRole.CASHIER;

export enum ExchangeState {
  PENDING = "pending",
  COMPLETED = "delivered",
  CANCELLED = "cancelled",
}

export const POINT_EXPIRATION_MONTHS = [3, 6, 9, 12] as const;
export type PointExpirationMonths = (typeof POINT_EXPIRATION_MONTHS)[number] | null;

export interface Organization {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Only the demo organization can be administered from the panel; the rest are example businesses. */
  managed: boolean;
}

export interface Storefront {
  id: string;
  orgId: string;
  name: string;
  online: boolean;
  address: string | null;
  city: string | null;
  province: string | null;
  category: string | null;
  color: string | null;
  hours: string | null;
  description: string | null;
  active: boolean;
}

export interface PointProgram {
  id: string;
  orgId: string;
  name: string;
  unitLabel: string | null;
  active: boolean;
  expirationMonths: PointExpirationMonths;
  storefrontIds: string[];
}

export interface Reward {
  id: string;
  programId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  costPoints: number;
  discountValue: number;
  active: boolean;
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  password: string;
  createdAt: string;
}

export interface Affiliation {
  userId: string;
  storefrontId: string;
  joinedAt: string;
}

export type TransactionKind = "grant" | "correction" | "redeem" | "refund" | "expire";

export interface Transaction {
  id: string;
  userId: string;
  programId: string;
  storefrontId: string;
  kind: TransactionKind;
  /** Signed delta applied to the balance. */
  points: number;
  note: string | null;
  byStaffId: string | null;
  createdAt: string;
  expiresAt: string | null;
  /** Corrections point to the grant they adjust. */
  correctsId?: string;
  exchangeId?: string;
}

export interface Exchange {
  id: string;
  code: string;
  rewardId: string;
  userId: string;
  programId: string;
  storefrontId: string;
  costPoints: number;
  state: ExchangeState;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByStaffId: string | null;
  refunded: boolean | null;
}

export interface StaffMember {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  role: StaffRole;
  active: boolean;
  storefrontIds: string[];
  createdAt: string;
}

export interface DeviceSession {
  id: string;
  device: string;
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface BillingInvoice {
  id: string;
  invoiceNumber: number;
  createdAt: string;
  dueAt: string;
  paymentStatus: "paid" | "pending" | "void";
  overdue: boolean;
  paidAt: string | null;
  paymentReference: string | null;
}

export interface Billing {
  planName: string;
  cycle: "monthly";
  subscriptionStatus: "pending" | "authorized" | "paused" | "cancelled" | "finished" | null;
  nextInvoiceDueAt: string | null;
  invoices: BillingInvoice[];
}

/* ---------- audit ---------- */

export type AuditUser = { id: string; name: string | null; username: string | null };
type NamedSummary = { id: string; name: string | null };
type ProgramSummary = NamedSummary & { unitLabel: string | null };
type RewardSummary = { id: string; title: string | null };
export type TransactionSummary = {
  id: string;
  program: ProgramSummary | null;
  storefront: NamedSummary | null;
  reward: RewardSummary | null;
};

type DetailsByOperation = {
  SESSION_REVOKE: Record<string, never>;
  STAFF_CREATE: { organization: NamedSummary | null; storefront: NamedSummary | null; role: string | null };
  USER_CREATE: { username: string | null };
  POINTS_GRANT: { points: number; storefront: NamedSummary | null; program: ProgramSummary | null; note: string | null };
  POINTS_CORRECTION: { transaction: TransactionSummary | null; correctedTransaction: TransactionSummary | null; points: number; note: string | null };
  REWARD_CLAIM: { reward: RewardSummary | null; costPoints: number; program: ProgramSummary | null };
  EXCHANGE_VERIFY: { transaction: TransactionSummary | null; code: string | null };
  EXCHANGE_APPROVE: { transaction: TransactionSummary | null; points: number };
  EXCHANGE_CANCEL: { transaction: TransactionSummary | null; points: number; refunded: boolean };
  EXCHANGE_USER_CANCEL: { transaction: TransactionSummary | null; points: number };
};

export type OperationType = keyof DetailsByOperation;
export type AuditRecord = {
  [K in OperationType]: {
    operationId: string;
    operationType: K;
    originatingUser: AuditUser;
    affectedUsers: AuditUser[];
    createdAt: string;
    details: DetailsByOperation[K];
  };
}[OperationType];

/** Audit rows are stored with the organization they belong to, so the panel only lists its own. */
export type StoredAuditRecord = AuditRecord & { orgId: string };

/* ---------- whole state ---------- */

export interface DemoSession {
  customerId: string | null;
  staff: { staffId: string; storefrontId: string } | null;
}

export interface DemoState {
  version: number;
  organizations: Organization[];
  storefronts: Storefront[];
  programs: PointProgram[];
  rewards: Reward[];
  customers: CustomerAccount[];
  affiliations: Affiliation[];
  transactions: Transaction[];
  exchanges: Exchange[];
  staff: StaffMember[];
  audit: StoredAuditRecord[];
  deviceSessions: Record<string, DeviceSession[]>;
  billing: Billing;
  session: DemoSession;
}

/* ---------- view models shared by components ---------- */

export type PagedResponse<T> = { items: T[]; page: number; size: number; totalPages: number; totalElements: number };
export type SearchOptions = { search: string; page: number; size: number };
export type PagedRequestFunction<T> = (options: SearchOptions) => Promise<PagedResponse<T>>;

/** Customer row from the staff search. */
export interface CustomerOption {
  id: string;
  name: string;
  username: string;
  email: string;
  points: number | null;
}
