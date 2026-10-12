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
  }
}[OperationType];

export type AuditFilters = {
  originatingUserId?: string;
  affectedUserId?: string;
  operationType?: OperationType;
};
