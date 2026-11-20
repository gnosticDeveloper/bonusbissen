import type { AuditUser, DemoState, Exchange, StaffMember, StoredAuditRecord, Transaction, TransactionSummary } from "./types";
import { ExchangeState } from "./types";

let auditSeq = 0;
const auditId = () => `op-${Date.now().toString(36)}-${(++auditSeq).toString(36)}`;

/** Customers and staff share the audit's user space; staff rows use their membership id. */
export function auditUser(state: DemoState, id: string | null): AuditUser {
  if (!id) return { id: "system", name: "Sistema", username: null };
  const customer = state.customers.find((c) => c.id === id);
  if (customer) return { id: customer.id, name: customer.name, username: customer.email };
  const staff = state.staff.find((s) => s.id === id);
  if (staff) return { id: staff.id, name: staff.name, username: staff.email };
  return { id, name: null, username: null };
}

function orgOfProgram(state: DemoState, programId: string): string {
  return state.programs.find((p) => p.id === programId)?.orgId ?? "";
}

function programSummary(state: DemoState, programId: string) {
  const program = state.programs.find((p) => p.id === programId);
  return program ? { id: program.id, name: program.name, unitLabel: program.unitLabel } : null;
}

function storefrontSummary(state: DemoState, storefrontId: string) {
  const storefront = state.storefronts.find((s) => s.id === storefrontId);
  return storefront ? { id: storefront.id, name: storefront.name } : null;
}

function exchangeSummary(state: DemoState, exchange: Exchange): TransactionSummary {
  const reward = state.rewards.find((r) => r.id === exchange.rewardId);
  return {
    id: exchange.id,
    program: programSummary(state, exchange.programId),
    storefront: storefrontSummary(state, exchange.storefrontId),
    reward: reward ? { id: reward.id, title: reward.title } : { id: exchange.rewardId, title: null },
  };
}

function txSummary(state: DemoState, tx: Transaction): TransactionSummary {
  return { id: tx.id, program: programSummary(state, tx.programId), storefront: storefrontSummary(state, tx.storefrontId), reward: null };
}

export function auditForGrant(state: DemoState, tx: Transaction): StoredAuditRecord {
  return {
    orgId: orgOfProgram(state, tx.programId),
    operationId: auditId(),
    operationType: "POINTS_GRANT",
    originatingUser: auditUser(state, tx.byStaffId),
    affectedUsers: [auditUser(state, tx.userId)],
    createdAt: tx.createdAt,
    details: { points: tx.points, storefront: storefrontSummary(state, tx.storefrontId), program: programSummary(state, tx.programId), note: tx.note },
  };
}

export function auditForCorrection(state: DemoState, tx: Transaction, original: Transaction): StoredAuditRecord {
  return {
    orgId: orgOfProgram(state, tx.programId),
    operationId: auditId(),
    operationType: "POINTS_CORRECTION",
    originatingUser: auditUser(state, tx.byStaffId),
    affectedUsers: [auditUser(state, tx.userId)],
    createdAt: tx.createdAt,
    details: { transaction: txSummary(state, tx), correctedTransaction: txSummary(state, original), points: tx.points, note: tx.note },
  };
}

export function auditForClaim(state: DemoState, exchange: Exchange): StoredAuditRecord {
  const reward = state.rewards.find((r) => r.id === exchange.rewardId);
  return {
    orgId: orgOfProgram(state, exchange.programId),
    operationId: auditId(),
    operationType: "REWARD_CLAIM",
    originatingUser: auditUser(state, exchange.userId),
    affectedUsers: [auditUser(state, exchange.userId)],
    createdAt: exchange.createdAt,
    details: {
      reward: reward ? { id: reward.id, title: reward.title } : null,
      costPoints: exchange.costPoints,
      program: programSummary(state, exchange.programId),
    },
  };
}

export function auditForVerify(state: DemoState, exchange: Exchange, staffId: string): StoredAuditRecord {
  return {
    orgId: orgOfProgram(state, exchange.programId),
    operationId: auditId(),
    operationType: "EXCHANGE_VERIFY",
    originatingUser: auditUser(state, staffId),
    affectedUsers: [auditUser(state, exchange.userId)],
    createdAt: new Date().toISOString(),
    details: { transaction: exchangeSummary(state, exchange), code: exchange.code },
  };
}

export function auditForExchangeResolution(state: DemoState, exchange: Exchange, staffId: string): StoredAuditRecord {
  const base = {
    orgId: orgOfProgram(state, exchange.programId),
    operationId: auditId(),
    originatingUser: auditUser(state, staffId),
    affectedUsers: [auditUser(state, exchange.userId)],
    createdAt: exchange.resolvedAt ?? new Date().toISOString(),
  };
  if (exchange.state === ExchangeState.COMPLETED) {
    return { ...base, operationType: "EXCHANGE_APPROVE", details: { transaction: exchangeSummary(state, exchange), points: exchange.costPoints } };
  }
  return {
    ...base,
    operationType: "EXCHANGE_CANCEL",
    details: { transaction: exchangeSummary(state, exchange), points: exchange.costPoints, refunded: Boolean(exchange.refunded) },
  };
}

export function auditForUserCancel(state: DemoState, exchange: Exchange): StoredAuditRecord {
  return {
    orgId: orgOfProgram(state, exchange.programId),
    operationId: auditId(),
    operationType: "EXCHANGE_USER_CANCEL",
    originatingUser: auditUser(state, exchange.userId),
    affectedUsers: [auditUser(state, exchange.userId)],
    createdAt: exchange.resolvedAt ?? new Date().toISOString(),
    details: { transaction: exchangeSummary(state, exchange), points: exchange.costPoints },
  };
}

export function auditForStaffCreate(state: DemoState, member: StaffMember, storefrontId: string, byStaffId: string, createdAt: string): StoredAuditRecord {
  const org = state.organizations.find((o) => o.managed);
  return {
    orgId: org?.id ?? "",
    operationId: auditId(),
    operationType: "STAFF_CREATE",
    originatingUser: auditUser(state, byStaffId),
    affectedUsers: [auditUser(state, member.id)],
    createdAt,
    details: { organization: org ? { id: org.id, name: org.name } : null, storefront: storefrontSummary(state, storefrontId), role: member.role },
  };
}

export function auditForSessionRevoke(state: DemoState, orgId: string, byId: string, affectedId: string): StoredAuditRecord {
  return {
    orgId,
    operationId: auditId(),
    operationType: "SESSION_REVOKE",
    originatingUser: auditUser(state, byId),
    affectedUsers: [auditUser(state, affectedId)],
    createdAt: new Date().toISOString(),
    details: {},
  };
}
