"use client";

/**
 * Mock backend. Each function stands in for a server action of the real app:
 * same inputs, same `{ ok, data | error }` results, but reading and writing the
 * sessionStorage state. A short delay keeps loading states visible, as in production.
 */

import {
  auditForClaim,
  auditForCorrection,
  auditForExchangeResolution,
  auditForGrant,
  auditForSessionRevoke,
  auditForStaffCreate,
  auditForUserCancel,
  auditForVerify,
} from "./audit";
import {
  balanceOf,
  currentCustomer,
  currentStaff,
  effectiveAmount,
  getState,
  isMemberOfStorefront,
  managedOrg,
  orgOf,
  programOfStorefront,
  updateState,
} from "./store";
import {
  ExchangeState,
  UserRole,
  type ActionResult,
  type AuditRecord,
  type AuditUser,
  type CustomerOption,
  type DemoState,
  type Exchange,
  type OperationType,
  type PagedResponse,
  type PointExpirationMonths,
  type Reward,
  type SearchOptions,
  type StaffMember,
  type Storefront,
  type Transaction,
} from "./types";
import { formatDate, formatDateTime } from "@/lib/helpers/format";

/* ---------- plumbing ---------- */

const wait = (ms = 280 + Math.random() * 320) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = <T>(error: string, status?: number): ActionResult<T> => ({ ok: false, error, status });

let idSeq = 0;
export const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++idSeq).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es-AR")
    .trim();

function paginate<T>(items: T[], page: number, size: number): PagedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  return { items: items.slice(page * size, (page + 1) * size), page, size, totalPages, totalElements: items.length };
}

/** 4 digits, a letter and a digit, like the backend codes (e.g. 1234A5). */
function makeExchangeCode(state: DemoState): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (;;) {
    const digits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const code = `${digits}${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(Math.random() * 10)}`;
    if (!state.exchanges.some((e) => e.code === code)) return code;
  }
}

const pointLabelOf = (state: DemoState, programId: string) => state.programs.find((p) => p.id === programId)?.unitLabel || "puntos";

function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

/* ---------- view models ---------- */

export type RewardView = Reward & { imageThumbnailUrl: string | null; createdAtFormatted: string };

const rewardView = (reward: Reward): RewardView => ({
  ...reward,
  imageThumbnailUrl: reward.imageUrl,
  createdAtFormatted: formatDate(reward.createdAt),
});

export type Business = {
  id: string;
  name: string;
  orgName: string;
  category: string;
  description: string;
  color: string;
  orgLogoUrl: string | null;
  orgBannerUrl: string | null;
  pointLabel: string;
  points: number;
  member: boolean;
  rewards: RewardView[];
  address: { street: string; city: string; province: string };
};

export type StorefrontDiscoverInfo = {
  id: string;
  name: string;
  orgName: string;
  color: string;
  pointLabel: string | null;
  orgLogoUrl: string | null;
  orgBannerUrl: string | null;
  description: string | null;
  address: { street: string; city: string; province: string } | null;
  programId: string | null;
};

function discoverInfo(state: DemoState, storefront: Storefront): StorefrontDiscoverInfo {
  const org = orgOf(state, storefront.orgId);
  const program = programOfStorefront(state, storefront.id);
  return {
    id: storefront.id,
    name: storefront.name,
    orgName: org?.name ?? "Negocio",
    color: storefront.color ?? "#d4822b",
    pointLabel: program?.unitLabel ?? null,
    orgLogoUrl: org?.logoUrl ?? null,
    orgBannerUrl: org?.bannerUrl ?? null,
    description: storefront.description,
    address: storefront.address ? { street: storefront.address, city: storefront.city ?? "", province: storefront.province ?? "" } : null,
    programId: program?.id ?? null,
  };
}

/* ================================================================== */
/* Customer authentication                                             */
/* ================================================================== */

export async function customerSignIn(identifier: string, password: string): Promise<ActionResult<{ name: string }>> {
  await wait();
  const id = normalize(identifier);
  const state = getState();
  const customer = state.customers.find((c) => normalize(c.username) === id || normalize(c.email) === id);
  if (!customer || customer.password !== password) return fail("Usuario o contraseña incorrectos.", 401);
  updateState((draft) => {
    draft.session.customerId = customer.id;
  });
  return ok({ name: customer.name });
}

export async function requestLoginLink(email: string): Promise<ActionResult<null>> {
  await wait();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Ingresá un email válido.");
  return ok(null);
}

export async function customerSignUp(input: { name: string; username: string; email: string; password: string }): Promise<ActionResult<{ name: string }>> {
  await wait();
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) return fail("Ingresá tu nombre público.");
  if (!/^[a-z0-9._]{3,30}$/.test(username)) return fail("El nombre de usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Ingresá un correo electrónico válido.");
  if (input.password.length < 8) return fail("La contraseña debe tener al menos 8 caracteres.");
  const state = getState();
  if (state.customers.some((c) => c.username === username) || state.staff.some((s) => s.username === username)) return fail("Ese nombre de usuario ya está en uso.", 409);
  if (state.customers.some((c) => c.email === email)) return fail("Ya existe una cuenta con ese email.", 409);
  const id = makeId("c");
  const now = new Date().toISOString();
  updateState((draft) => {
    draft.customers.push({ id, name, username, email, emailVerified: false, avatarUrl: null, password: input.password, createdAt: now });
    draft.deviceSessions[id] = [{ id: makeId("ds"), device: "Este navegador", current: true, createdAt: now, lastUsedAt: now }];
    draft.session.customerId = id;
  });
  return ok({ name });
}

export async function customerSignOut(): Promise<void> {
  await wait(150);
  updateState((draft) => {
    draft.session.customerId = null;
  });
}

/* ================================================================== */
/* Customer: home, discovery, membership                               */
/* ================================================================== */

export type Membership = {
  id: string;
  org: { id: string; name: string; category: string; color: string };
  storefrontName: string;
  points: number;
  pointLabel: string;
  totalRedemptions: number;
  memberSince: string;
};

export type PointsResponse = { summary: { totalPoints: number }; memberships: Membership[] };

export async function getPoints(): Promise<ActionResult<PointsResponse>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);

  const memberships: Membership[] = [];
  for (const program of state.programs) {
    const affiliations = state.affiliations.filter((a) => a.userId === customer.id && program.storefrontIds.includes(a.storefrontId));
    if (affiliations.length === 0) continue;
    const org = orgOf(state, program.orgId);
    const firstStorefront = state.storefronts.find((s) => s.id === affiliations[0].storefrontId);
    memberships.push({
      id: program.id,
      org: { id: program.orgId, name: org?.name ?? "Negocio", category: firstStorefront?.category ?? org?.category ?? "", color: firstStorefront?.color ?? "#d4822b" },
      storefrontName: affiliations.map((a) => state.storefronts.find((s) => s.id === a.storefrontId)?.name).filter(Boolean).join(" · "),
      points: balanceOf(state, customer.id, program.id),
      pointLabel: program.unitLabel || "puntos",
      totalRedemptions: state.exchanges.filter((e) => e.userId === customer.id && e.programId === program.id && e.state !== ExchangeState.CANCELLED).length,
      memberSince: affiliations.map((a) => a.joinedAt).sort()[0],
    });
  }
  memberships.sort((a, b) => b.points - a.points);
  return ok({ summary: { totalPoints: memberships.reduce((sum, m) => sum + Math.max(0, m.points), 0) }, memberships });
}

export async function getLocations(): Promise<ActionResult<{ id: string; name: string }[]>> {
  await wait(220);
  const cities = [...new Set(getState().storefronts.filter((s) => s.active && s.city).map((s) => s.city!))].sort((a, b) => a.localeCompare(b, "es"));
  return ok(cities.map((name) => ({ id: name, name })));
}

export async function getBusinesses({ page = 0, size = 10, city }: { page?: number; size?: number; city?: string | null } = {}): Promise<ActionResult<PagedResponse<Business>>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  const list = state.storefronts
    .filter((s) => s.active && (!city || s.city === city))
    .map((storefront): Business | null => {
      const program = programOfStorefront(state, storefront.id);
      if (!program || !program.active) return null;
      const org = orgOf(state, storefront.orgId);
      return {
        id: storefront.id,
        name: storefront.name,
        orgName: org?.name ?? "Negocio",
        category: storefront.category ?? org?.category ?? "",
        description: storefront.description ?? "",
        color: storefront.color ?? "#d4822b",
        orgLogoUrl: org?.logoUrl ?? null,
        orgBannerUrl: org?.bannerUrl ?? null,
        pointLabel: program.unitLabel || "puntos",
        points: customer ? balanceOf(state, customer.id, program.id) : 0,
        member: customer ? isMemberOfStorefront(state, customer.id, storefront.id) : false,
        rewards: state.rewards.filter((r) => r.programId === program.id && r.active).map(rewardView),
        address: { street: storefront.address ?? "Tienda online", city: storefront.city ?? "Online", province: storefront.province ?? "" },
      };
    })
    .filter((b): b is Business => b !== null)
    // The demo business first, so prospects see their own storefronts at the top.
    .sort((a, b) => Number(orgOf(state, state.storefronts.find((s) => s.id === b.id)!.orgId)?.managed) - Number(orgOf(state, state.storefronts.find((s) => s.id === a.id)!.orgId)?.managed));
  return ok(paginate(list, page, size));
}

export function getStorefrontDiscoverInfoSync(state: DemoState, storefrontId: string): StorefrontDiscoverInfo | null {
  const storefront = state.storefronts.find((s) => s.id === storefrontId && s.active);
  return storefront ? discoverInfo(state, storefront) : null;
}

export async function joinStorefront(storefrontId: string): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Iniciá sesión para sumarte.", 401);
  const program = programOfStorefront(state, storefrontId);
  if (!program || !program.active) return fail("Este local todavía no tiene un programa de puntos activo.", 409);
  if (isMemberOfStorefront(state, customer.id, storefrontId)) return ok(null);
  updateState((draft) => {
    draft.affiliations.push({ userId: customer.id, storefrontId, joinedAt: new Date().toISOString() });
  });
  return ok(null);
}

export async function getMemberRewards(storefrontId: string): Promise<ActionResult<RewardView[]>> {
  await wait();
  const state = getState();
  const program = programOfStorefront(state, storefrontId);
  if (!program) return ok([]);
  return ok(
    state.rewards
      .filter((r) => r.programId === program.id && r.active)
      .sort((a, b) => a.costPoints - b.costPoints)
      .map(rewardView),
  );
}

export async function claimReward(rewardId: string, storefrontId: string): Promise<ActionResult<{ code: string }>> {
  await wait(500);
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  const reward = state.rewards.find((r) => r.id === rewardId && r.active);
  if (!reward) return fail("Esta recompensa ya no está disponible.", 404);
  if (!isMemberOfStorefront(state, customer.id, storefrontId)) return fail("Tenés que estar afiliado a este local para canjear.", 403);
  const balance = balanceOf(state, customer.id, reward.programId);
  const label = pointLabelOf(state, reward.programId);
  if (balance < reward.costPoints) {
    return fail(`No te alcanzan los ${label}: tenés ${balance} y esta recompensa cuesta ${reward.costPoints}.`, 409);
  }
  const code = makeExchangeCode(state);
  const now = new Date().toISOString();
  updateState((draft) => {
    const exchange: Exchange = {
      id: makeId("ex"),
      code,
      rewardId,
      userId: customer.id,
      programId: reward.programId,
      storefrontId,
      costPoints: reward.costPoints,
      state: ExchangeState.PENDING,
      createdAt: now,
      resolvedAt: null,
      resolvedByStaffId: null,
      refunded: null,
    };
    draft.exchanges.push(exchange);
    draft.transactions.push({
      id: makeId("tx"),
      userId: customer.id,
      programId: reward.programId,
      storefrontId,
      kind: "redeem",
      points: -reward.costPoints,
      note: null,
      byStaffId: null,
      createdAt: now,
      expiresAt: null,
      exchangeId: exchange.id,
    });
    draft.audit.push(auditForClaim(draft, exchange));
  });
  return ok({ code });
}

export type HistoricalExchange = {
  id: string;
  state: ExchangeState;
  exchangeCode: string | null;
  rewardTitle: string;
  rewardImageUrl: string | null;
  costPoints: number;
  pointsUnitLabel: string;
  formattedCreatedAt: string;
  organizationName: string;
  storefrontName: string;
};

export async function getExchangeHistory(): Promise<ActionResult<HistoricalExchange[]>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  return ok(
    state.exchanges
      .filter((e) => e.userId === customer.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((e) => {
        const reward = state.rewards.find((r) => r.id === e.rewardId);
        const storefront = state.storefronts.find((s) => s.id === e.storefrontId);
        const org = storefront ? orgOf(state, storefront.orgId) : null;
        return {
          id: e.id,
          state: e.state,
          exchangeCode: e.state === ExchangeState.PENDING ? e.code : null,
          rewardTitle: reward?.title ?? "Recompensa eliminada",
          rewardImageUrl: reward?.imageUrl ?? null,
          costPoints: e.costPoints,
          pointsUnitLabel: pointLabelOf(state, e.programId),
          formattedCreatedAt: formatDateTime(e.createdAt),
          organizationName: org?.name ?? "Negocio",
          storefrontName: storefront?.name ?? "",
        };
      }),
  );
}

export async function cancelRedemption(exchangeId: string): Promise<ActionResult<null>> {
  await wait(500);
  const state = getState();
  const customer = currentCustomer(state);
  const exchange = state.exchanges.find((e) => e.id === exchangeId);
  if (!customer || !exchange || exchange.userId !== customer.id) return fail("No encontramos ese canje.", 404);
  if (exchange.state !== ExchangeState.PENDING) return fail("Este canje ya fue resuelto y no se puede cancelar.", 409);
  updateState((draft) => {
    const target = draft.exchanges.find((e) => e.id === exchangeId)!;
    const now = new Date().toISOString();
    target.state = ExchangeState.CANCELLED;
    target.resolvedAt = now;
    target.refunded = true;
    draft.transactions.push({
      id: makeId("tx"),
      userId: target.userId,
      programId: target.programId,
      storefrontId: target.storefrontId,
      kind: "refund",
      points: target.costPoints,
      note: null,
      byStaffId: null,
      createdAt: now,
      expiresAt: null,
      exchangeId: target.id,
    });
    draft.audit.push(auditForUserCancel(draft, target));
  });
  return ok(null);
}

export type MovementResponse = {
  id: string;
  type: "redeem" | "earn" | "adjust" | "expire";
  points: number;
  imageUrl?: string;
  title: string;
  orgName?: string;
  storefrontName?: string;
  pointsLabel?: string;
  formattedCreatedAt: string;
  createdAt: string;
  expiresAt: string | null;
  expirationApplicable: boolean;
  correction: boolean;
  correctedTransactionAmount: number | null;
};

export async function getMovementsHistory(storefrontId: string): Promise<ActionResult<MovementResponse[]>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  const program = programOfStorefront(state, storefrontId);
  if (!program) return ok([]);
  const org = orgOf(state, program.orgId);
  const label = program.unitLabel || "puntos";

  const movements = state.transactions
    .filter((t) => t.userId === customer.id && t.programId === program.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((t): MovementResponse => {
      const storefront = state.storefronts.find((s) => s.id === t.storefrontId);
      const exchange = t.exchangeId ? state.exchanges.find((e) => e.id === t.exchangeId) : null;
      const reward = exchange ? state.rewards.find((r) => r.id === exchange.rewardId) : null;
      const original = t.correctsId ? state.transactions.find((o) => o.id === t.correctsId) : null;
      const base = {
        id: t.id,
        points: t.points,
        orgName: org?.name,
        storefrontName: storefront?.name,
        pointsLabel: label,
        formattedCreatedAt: formatDateTime(t.createdAt),
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        expirationApplicable: false,
        correction: false,
        correctedTransactionAmount: null,
      };
      switch (t.kind) {
        case "grant":
          return {
            ...base,
            type: t.points >= 0 ? "earn" : "adjust",
            title: t.points >= 0 ? `Sumaste ${label}` : `Ajuste de ${label}`,
            expirationApplicable: t.points > 0 && program.expirationMonths !== null,
          };
        case "correction":
          return { ...base, type: "adjust", title: `Corrección de ${label}`, correction: true, correctedTransactionAmount: original?.points ?? null };
        case "redeem":
          return { ...base, type: "redeem", title: reward ? `Canjeaste ${reward.title}` : "Canje de recompensa", imageUrl: reward?.imageUrl ?? undefined };
        case "refund":
          return { ...base, type: "earn", title: reward ? `Devolución: ${reward.title}` : "Devolución de canje", imageUrl: reward?.imageUrl ?? undefined };
        case "expire":
          return { ...base, type: "expire", title: `${label[0].toUpperCase()}${label.slice(1)} vencidos`, expirationApplicable: true };
      }
    });
  return ok(movements);
}

/* ---------- customer profile ---------- */

export async function updateCustomerProfile(input: { name: string; email: string }): Promise<ActionResult<{ name: string; username: string; email: string; emailVerified: boolean }>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return fail("Ingresá tu nombre.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Ingresá un email válido.");
  if (email && state.customers.some((c) => c.id !== customer.id && c.email === email)) return fail("Ese email ya está en uso.", 409);
  const emailChanged = email !== customer.email;
  updateState((draft) => {
    const target = draft.customers.find((c) => c.id === customer.id)!;
    target.name = name;
    target.email = email;
    if (emailChanged) target.emailVerified = false;
  });
  return ok({ name, username: customer.username, email, emailVerified: emailChanged ? false : customer.emailVerified });
}

export async function updateCustomerPassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  if (customer.password !== input.currentPassword) return fail("La contraseña actual no es correcta.", 401);
  updateState((draft) => {
    draft.customers.find((c) => c.id === customer.id)!.password = input.newPassword;
  });
  return ok(null);
}

export async function resendVerificationEmail(): Promise<ActionResult<null>> {
  await wait();
  return ok(null);
}

export async function uploadAvatar(dataUrl: string): Promise<ActionResult<string | null>> {
  await wait(450);
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  const { persisted } = updateState((draft) => {
    draft.customers.find((c) => c.id === customer.id)!.avatarUrl = dataUrl;
  });
  if (!persisted) return fail("La imagen es demasiado pesada para guardarla en esta demo. Probá con una más chica.");
  return ok(dataUrl);
}

export async function getDeviceSessions() {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail<typeof state.deviceSessions[string]>("Tu sesión expiró.", 401);
  const sessions = state.deviceSessions[customer.id];
  if (sessions?.length) return ok(sessions);
  const now = new Date().toISOString();
  return ok([{ id: "ds-current", device: "Este navegador", current: true, createdAt: customer.createdAt, lastUsedAt: now }]);
}

export async function revokeDeviceSession(sessionId: string, current: boolean): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  updateState((draft) => {
    draft.deviceSessions[customer.id] = (draft.deviceSessions[customer.id] ?? []).filter((s) => s.id !== sessionId);
    if (current) draft.session.customerId = null;
  });
  return ok(null);
}

export async function revokeAllDeviceSessions(): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  updateState((draft) => {
    draft.deviceSessions[customer.id] = [];
    draft.audit.push(auditForSessionRevoke(draft, managedOrg(draft).id, customer.id, customer.id));
    draft.session.customerId = null;
  });
  return ok(null);
}

export async function deleteAccount(): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const customer = currentCustomer(state);
  if (!customer) return fail("Tu sesión expiró.", 401);
  updateState((draft) => {
    draft.customers = draft.customers.filter((c) => c.id !== customer.id);
    draft.affiliations = draft.affiliations.filter((a) => a.userId !== customer.id);
    draft.session.customerId = null;
  });
  return ok(null);
}

/* ================================================================== */
/* Staff authentication                                                */
/* ================================================================== */

export type OrganizationOption = { id: string; name: string };
export type StorefrontSummary = { id: string; name: string };

export async function getAllOrganizations({ search, page, size }: SearchOptions): Promise<PagedResponse<OrganizationOption>> {
  await wait(220);
  const query = normalize(search);
  const orgs = getState()
    .organizations.filter((o) => o.managed && normalize(o.name).includes(query))
    .map((o) => ({ id: o.id, name: o.name }));
  return paginate(orgs, page, size);
}

function accessibleStorefronts(state: DemoState, member: StaffMember): StorefrontSummary[] {
  return state.storefronts.filter((s) => s.active && member.storefrontIds.includes(s.id)).map((s) => ({ id: s.id, name: s.name }));
}

export async function staffSignIn(orgId: string, identifier: string, password: string): Promise<ActionResult<{ storefronts: StorefrontSummary[] }>> {
  await wait();
  const state = getState();
  const id = normalize(identifier);
  const member = state.staff.find((s) => s.active && (normalize(s.username) === id || normalize(s.email) === id));
  if (!member || member.password !== password || managedOrg(state).id !== orgId) return fail("Usuario o contraseña incorrectos.", 401);
  const storefronts = accessibleStorefronts(state, member);
  if (storefronts.length === 0) return fail("Tu usuario no tiene locales activos asignados.", 403);
  if (storefronts.length === 1) {
    updateState((draft) => {
      draft.session.staff = { staffId: member.id, storefrontId: storefronts[0].id };
    });
  } else {
    // Signed in, storefront still pending: the modal completes it. A new sign-in replaces any previous session.
    pendingStaffId = member.id;
    updateState((draft) => {
      draft.session.staff = null;
    });
  }
  return ok({ storefronts });
}

let pendingStaffId: string | null = null;

export async function selectStorefront(storefrontId: string): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const staffId = pendingStaffId ?? currentStaff(state)?.member.id;
  const member = state.staff.find((s) => s.id === staffId && s.active);
  if (!member) return fail("Tu sesión expiró. Volvé a iniciar sesión.", 401);
  if (!accessibleStorefronts(state, member).some((s) => s.id === storefrontId)) return fail("No tenés acceso a ese local.", 403);
  pendingStaffId = null;
  updateState((draft) => {
    draft.session.staff = { staffId: member.id, storefrontId };
  });
  return ok(null);
}

export async function staffSignOut(): Promise<void> {
  await wait(200);
  updateState((draft) => {
    draft.session.staff = null;
  });
}

export function dashboardStorefronts(state: DemoState): StorefrontSummary[] {
  const staff = currentStaff(state);
  return staff ? accessibleStorefronts(state, staff.member) : [];
}

/** Resolves the signed-in staff member and their storefront, like the verified JWT in production. */
function staffContext(state: DemoState) {
  const staff = currentStaff(state);
  if (!staff) return null;
  const storefront = state.storefronts.find((s) => s.id === staff.storefrontId) ?? null;
  const program = storefront ? programOfStorefront(state, storefront.id) : null;
  return { ...staff, storefront, program, org: managedOrg(state) };
}

function requireAdmin(state: DemoState) {
  const ctx = staffContext(state);
  if (!ctx) return { error: fail<never>("Tu sesión expiró. Volvé a iniciar sesión.", 401) };
  if (ctx.member.role !== UserRole.ADMIN) return { error: fail<never>("Solo un administrador puede hacer esto.", 403) };
  return { ctx };
}

/* ================================================================== */
/* Dashboard home                                                      */
/* ================================================================== */

export async function getDashboardHome() {
  await wait();
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx || !ctx.storefront) return fail<never>("Tu sesión expiró.", 401);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const inMonth = (iso: string) => Date.parse(iso) >= monthStart.getTime();
  const storefrontExchanges = state.exchanges.filter((e) => e.storefrontId === ctx.storefront!.id);
  const pending = storefrontExchanges.filter((e) => e.state === ExchangeState.PENDING);
  const members = state.affiliations.filter((a) => a.storefrontId === ctx.storefront!.id);

  const rewardCounts = new Map<string, number>();
  for (const e of storefrontExchanges) if (inMonth(e.createdAt) && e.state !== ExchangeState.CANCELLED) rewardCounts.set(e.rewardId, (rewardCounts.get(e.rewardId) ?? 0) + 1);

  return ok({
    stats: {
      totalExchanges: storefrontExchanges.filter((e) => inMonth(e.createdAt)).length,
      pendingExchanges: pending.length,
      totalUsers: members.length,
      totalPointsAwarded: state.transactions
        .filter((t) => t.storefrontId === ctx.storefront!.id && (t.kind === "grant" || t.kind === "correction") && t.points > 0)
        .reduce((sum, t) => sum + t.points, 0),
    },
    pending: pending
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((e) => ({
        id: e.id,
        customerName: state.customers.find((c) => c.id === e.userId)?.name ?? "Cliente",
        rewardTitle: state.rewards.find((r) => r.id === e.rewardId)?.title ?? "Recompensa",
        points: e.costPoints,
        createdAtFormatted: formatDateTime(e.createdAt),
      })),
    topRewards: [...rewardCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rewardId, claimCount]) => {
        const reward = state.rewards.find((r) => r.id === rewardId);
        return { id: rewardId, title: reward?.title ?? "Recompensa eliminada", claimCount, points: reward?.costPoints ?? 0 };
      }),
    topClients: ctx.program
      ? members
          .map((m) => ({ id: m.userId, name: state.customers.find((c) => c.id === m.userId)?.name ?? "Cliente", totalPoints: balanceOf(state, m.userId, ctx.program!.id) }))
          .sort((a, b) => b.totalPoints - a.totalPoints)
          .slice(0, 5)
      : [],
  });
}

/* ================================================================== */
/* Points                                                              */
/* ================================================================== */

export async function searchCustomers({ search, page, size }: SearchOptions): Promise<PagedResponse<CustomerOption>> {
  await wait(220);
  const state = getState();
  const ctx = staffContext(state);
  const query = normalize(search);
  const matches = state.customers
    .filter((c) => normalize(`${c.name} ${c.username} ${c.email}`).includes(query))
    .map((c) => ({
      id: c.id,
      name: c.name,
      username: c.username,
      email: c.email,
      points: ctx?.program && ctx.storefront && isMemberOfStorefront(state, c.id, ctx.storefront.id) ? balanceOf(state, c.id, ctx.program.id) : null,
    }));
  return paginate(matches, page, size);
}

export const DEBT_ERROR_PREFIX = "La resta supera el saldo disponible.";

export async function grantPointsTo(userId: string, points: number, note: string, allowDebt = false): Promise<ActionResult<{ pointsGranted: number; userName: string }>> {
  await wait(450);
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx || !ctx.storefront) return fail("Tu sesión expiró.", 401);
  if (!ctx.program || !ctx.program.active) return fail("Este local no tiene un programa de puntos activo. Configuralo en «Mi negocio».", 409);
  const customer = state.customers.find((c) => c.id === userId);
  if (!customer) return fail("No encontramos al cliente.", 404);
  if (!isMemberOfStorefront(state, userId, ctx.storefront.id)) {
    return fail(`${customer.name} no está afiliado a ${ctx.storefront.name}. Pedile que se afilie y volvé a intentarlo.`, 422);
  }
  const balance = balanceOf(state, userId, ctx.program.id);
  if (points < 0 && balance + points < 0 && !allowDebt) {
    return fail(`${DEBT_ERROR_PREFIX} ${customer.name} tiene ${balance} puntos y la resta es de ${Math.abs(points)}. Si confirmás, va a quedar con ${balance + points} puntos.`, 409);
  }
  const now = new Date().toISOString();
  const program = ctx.program;
  updateState((draft) => {
    const tx: Transaction = {
      id: makeId("tx"),
      userId,
      programId: program.id,
      storefrontId: ctx.storefront!.id,
      kind: "grant",
      points,
      note: note.trim() || null,
      byStaffId: ctx.member.id,
      createdAt: now,
      expiresAt: program.expirationMonths && points > 0 ? addMonths(now, program.expirationMonths) : null,
    };
    draft.transactions.push(tx);
    draft.audit.push(auditForGrant(draft, tx));
  });
  return ok({ pointsGranted: points, userName: customer.name });
}

export type PointAction = {
  id: string;
  userId: string;
  userName: string;
  type: "add" | "subtract" | "edit";
  amount: number;
  effectiveAmount: number;
  note: string;
  byUserName: string;
  createdAt: string;
  expiresAt: string | null;
  expirationApplicable: boolean;
  correctedTransaction: { id: string; amount: number; note: string | null; createdAt: string; expiresAt: string | null; expirationApplicable: boolean } | null;
};

export async function getAllPointActions(userId?: string): Promise<ActionResult<PointAction[]>> {
  await wait();
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx || !ctx.storefront) return fail("Tu sesión expiró.", 401);
  const expirationApplicable = (tx: Transaction) => tx.points > 0 && Boolean(state.programs.find((p) => p.id === tx.programId)?.expirationMonths);
  return ok(
    state.transactions
      .filter((t) => t.storefrontId === ctx.storefront!.id && (t.kind === "grant" || t.kind === "correction") && (!userId || t.userId === userId))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 60)
      .map((t) => {
        const original = t.correctsId ? state.transactions.find((o) => o.id === t.correctsId) : null;
        return {
          id: t.id,
          userId: t.userId,
          userName: state.customers.find((c) => c.id === t.userId)?.name ?? "Cliente",
          type: t.kind === "correction" ? "edit" : t.points >= 0 ? "add" : "subtract",
          amount: t.points,
          effectiveAmount: t.kind === "grant" ? effectiveAmount(state, t) : t.points,
          note: t.note ?? "",
          byUserName: state.staff.find((s) => s.id === t.byStaffId)?.name ?? "Sistema",
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
          expirationApplicable: t.kind === "grant" && expirationApplicable(t),
          correctedTransaction: original
            ? { id: original.id, amount: original.points, note: original.note, createdAt: original.createdAt, expiresAt: original.expiresAt, expirationApplicable: expirationApplicable(original) }
            : null,
        };
      }),
  );
}

export async function updateGrant(actionId: string, values: { points: number; note: string; allowDebt?: boolean }): Promise<ActionResult<{ amount: number; userName: string }>> {
  await wait(450);
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx) return fail("Tu sesión expiró.", 401);
  const original = state.transactions.find((t) => t.id === actionId && t.kind === "grant");
  if (!original) return fail("No encontramos el movimiento.", 404);
  const delta = values.points - effectiveAmount(state, original);
  if (delta === 0) return fail("La cantidad ingresada es igual a la actual: no hay nada para corregir.", 422);
  const customer = state.customers.find((c) => c.id === original.userId);
  const balance = balanceOf(state, original.userId, original.programId);
  if (delta < 0 && balance + delta < 0 && !values.allowDebt) {
    return fail(`Esta corrección deja a ${customer?.name ?? "el cliente"} con ${balance + delta} puntos. Confirmá si querés registrar la deuda.`, 409);
  }
  updateState((draft) => {
    const tx: Transaction = {
      id: makeId("tx"),
      userId: original.userId,
      programId: original.programId,
      storefrontId: original.storefrontId,
      kind: "correction",
      points: delta,
      note: values.note,
      byStaffId: ctx.member.id,
      createdAt: new Date().toISOString(),
      expiresAt: original.expiresAt,
      correctsId: original.id,
    };
    draft.transactions.push(tx);
    draft.audit.push(auditForCorrection(draft, tx, original));
  });
  return ok({ amount: delta, userName: customer?.name ?? "el cliente" });
}

/* ================================================================== */
/* Redemptions                                                         */
/* ================================================================== */

export type ExchangeResponse = {
  id: string;
  state: ExchangeState;
  rewardId: string;
  userId: string;
  userName: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardImageUrl: string | null;
  rewardDiscountValue: string;
  rewardCostPoints: number;
  formattedCreatedAt: string;
  employeeName: string | null;
};

function exchangeResponse(state: DemoState, e: Exchange): ExchangeResponse {
  const reward = state.rewards.find((r) => r.id === e.rewardId);
  return {
    id: e.id,
    state: e.state,
    rewardId: e.rewardId,
    userId: e.userId,
    userName: state.customers.find((c) => c.id === e.userId)?.name ?? "Cliente",
    rewardTitle: reward?.title ?? "Recompensa eliminada",
    rewardDescription: reward?.description ?? "",
    rewardImageUrl: reward?.imageUrl ?? null,
    rewardDiscountValue: reward ? (reward.discountValue === 100 ? "Gratis" : `${reward.discountValue}% OFF`) : "",
    rewardCostPoints: e.costPoints,
    formattedCreatedAt: formatDateTime(e.createdAt),
    employeeName: state.staff.find((s) => s.id === e.resolvedByStaffId)?.name ?? null,
  };
}

export async function validateCode(code: string): Promise<ActionResult<ExchangeResponse>> {
  await wait(400);
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx) return fail("Tu sesión expiró.", 401);
  // Codes are valid in every storefront of the same program, never across programs.
  const exchange = state.exchanges.find((e) => e.code.toLowerCase() === code.trim().toLowerCase() && e.programId === ctx.program?.id);
  if (!exchange) return fail("No encontramos el canje.", 404);
  updateState((draft) => {
    draft.audit.push(auditForVerify(draft, exchange, ctx.member.id));
  });
  return ok(exchangeResponse(state, exchange));
}

function resolveExchange(exchangeId: string, next: ExchangeState.COMPLETED | ExchangeState.CANCELLED, refund: boolean): ActionResult<null> {
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx) return fail("Tu sesión expiró.", 401);
  const exchange = state.exchanges.find((e) => e.id === exchangeId);
  if (!exchange) return fail("No encontramos el canje.", 404);
  if (exchange.state !== ExchangeState.PENDING) return fail("Este canje ya fue resuelto.", 409);
  updateState((draft) => {
    const target = draft.exchanges.find((e) => e.id === exchangeId)!;
    const now = new Date().toISOString();
    target.state = next;
    target.resolvedAt = now;
    target.resolvedByStaffId = ctx.member.id;
    target.refunded = next === ExchangeState.CANCELLED ? refund : null;
    if (next === ExchangeState.CANCELLED && refund) {
      draft.transactions.push({
        id: makeId("tx"),
        userId: target.userId,
        programId: target.programId,
        storefrontId: target.storefrontId,
        kind: "refund",
        points: target.costPoints,
        note: null,
        byStaffId: ctx.member.id,
        createdAt: now,
        expiresAt: null,
        exchangeId: target.id,
      });
    }
    draft.audit.push(auditForExchangeResolution(draft, target, ctx.member.id));
  });
  return ok(null);
}

export async function confirmRedemption(exchangeId: string) {
  await wait(450);
  return resolveExchange(exchangeId, ExchangeState.COMPLETED, false);
}

export async function annulateExchange(exchangeId: string, refund: boolean) {
  await wait(450);
  return resolveExchange(exchangeId, ExchangeState.CANCELLED, refund);
}

export function resolvedExchangesSync(state: DemoState): ExchangeResponse[] {
  const ctx = staffContext(state);
  if (!ctx?.program) return [];
  return state.exchanges
    .filter((e) => e.programId === ctx.program!.id && e.state !== ExchangeState.PENDING)
    .sort((a, b) => Date.parse(b.resolvedAt ?? b.createdAt) - Date.parse(a.resolvedAt ?? a.createdAt))
    .map((e) => exchangeResponse(state, e));
}

/* ================================================================== */
/* Rewards (dashboard)                                                 */
/* ================================================================== */

export function dashboardRewardsSync(state: DemoState): RewardView[] {
  const ctx = staffContext(state);
  if (!ctx?.program) return [];
  return state.rewards
    .filter((r) => r.programId === ctx.program!.id && r.active)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(rewardView);
}

export async function getActivePrograms(): Promise<ActionResult<{ id: string; name: string }[]>> {
  await wait(250);
  const state = getState();
  const org = managedOrg(state);
  return ok(state.programs.filter((p) => p.orgId === org.id && p.active).map((p) => ({ id: p.id, name: p.name })));
}

export type RewardInput = { title: string; description: string; costPoints: number; discountValue: number; programId?: string; imageUrl?: string | null };

export async function createReward(input: RewardInput): Promise<ActionResult<{ title: string }>> {
  await wait(500);
  const { error } = requireAdmin(getState());
  if (error) return error;
  if (!input.programId) return fail("Elegí un programa de puntos.");
  if (input.discountValue < 0 || input.discountValue > 100) return fail("El descuento debe estar entre 0 y 100.");
  const { persisted } = updateState((draft) => {
    draft.rewards.push({
      id: makeId("rw"),
      programId: input.programId!,
      title: input.title.trim(),
      description: input.description.trim(),
      costPoints: input.costPoints,
      discountValue: input.discountValue,
      imageUrl: input.imageUrl ?? null,
      active: true,
      createdAt: new Date().toISOString(),
    });
  });
  if (!persisted) return fail("La imagen es demasiado pesada para guardarla en esta demo. Probá con una más chica.");
  return ok({ title: input.title.trim() });
}

export async function editReward(rewardId: string, input: RewardInput & { removeImage?: boolean }): Promise<ActionResult<{ title: string }>> {
  await wait(500);
  const { error } = requireAdmin(getState());
  if (error) return error;
  if (input.discountValue < 0 || input.discountValue > 100) return fail("El descuento debe estar entre 0 y 100.");
  const { persisted } = updateState((draft) => {
    const reward = draft.rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    reward.title = input.title.trim();
    reward.description = input.description.trim();
    reward.costPoints = input.costPoints;
    reward.discountValue = input.discountValue;
    if (input.imageUrl) reward.imageUrl = input.imageUrl;
    else if (input.removeImage) reward.imageUrl = null;
  });
  if (!persisted) return fail("La imagen es demasiado pesada para guardarla en esta demo. Probá con una más chica.");
  return ok({ title: input.title.trim() });
}

export async function deleteReward(rewardId: string): Promise<ActionResult<null>> {
  await wait(450);
  const { error } = requireAdmin(getState());
  if (error) return error;
  updateState((draft) => {
    const reward = draft.rewards.find((r) => r.id === rewardId);
    if (reward) reward.active = false;
  });
  return ok(null);
}

/* ================================================================== */
/* Customers list                                                      */
/* ================================================================== */

export type StorefrontCustomer = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  joinedAt: string;
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  lastActivityAt: string | null;
};

export function storefrontCustomersSync(state: DemoState): StorefrontCustomer[] | null {
  const ctx = staffContext(state);
  if (!ctx?.storefront) return null;
  const storefrontId = ctx.storefront.id;
  return state.affiliations
    .filter((a) => a.storefrontId === storefrontId)
    .map((a) => {
      const customer = state.customers.find((c) => c.id === a.userId);
      if (!customer) return null;
      const txs = state.transactions.filter((t) => t.userId === customer.id && t.storefrontId === storefrontId);
      const lastActivity = txs.map((t) => t.createdAt).sort().at(-1) ?? null;
      return {
        id: customer.id,
        name: customer.name,
        username: customer.username,
        email: customer.email || null,
        emailVerified: customer.emailVerified,
        joinedAt: a.joinedAt,
        balance: ctx.program ? balanceOf(state, customer.id, ctx.program.id) : 0,
        totalEarned: txs.filter((t) => t.kind === "grant" || t.kind === "correction").reduce((sum, t) => sum + Math.max(0, t.points), 0),
        totalRedeemed: txs.filter((t) => t.kind === "redeem").reduce((sum, t) => sum - t.points, 0) - txs.filter((t) => t.kind === "refund").reduce((sum, t) => sum + t.points, 0),
        lastActivityAt: lastActivity,
      };
    })
    .filter((c): c is StorefrontCustomer => c !== null);
}

/* ================================================================== */
/* My business                                                         */
/* ================================================================== */

export async function updateOrganizationName(name: string): Promise<ActionResult<null>> {
  await wait();
  const { error } = requireAdmin(getState());
  if (error) return error;
  const value = name.trim();
  if (value.length < 2) return fail("El nombre del negocio debe tener al menos 2 caracteres.");
  updateState((draft) => {
    managedOrg(draft).name = value;
  });
  return ok(null);
}

export async function uploadOrganizationImage(kind: "logo" | "banner", dataUrl: string): Promise<ActionResult<string | null>> {
  await wait(450);
  const { error } = requireAdmin(getState());
  if (error) return error;
  const { persisted } = updateState((draft) => {
    const org = managedOrg(draft);
    if (kind === "logo") org.logoUrl = dataUrl;
    else org.bannerUrl = dataUrl;
  });
  if (!persisted) return fail("La imagen es demasiado pesada para guardarla en esta demo. Probá con una más chica.");
  return ok(dataUrl);
}

export type StorefrontInput = {
  name: string;
  online: boolean;
  province: string;
  city: string;
  address: string;
  category: string;
  color: string;
  hours: string;
  description: string;
  active: boolean;
};

function validateStorefront(input: StorefrontInput): string | null {
  if (input.name.trim().length < 2) return "Ingresá un nombre para la sucursal.";
  if (!input.online && (!input.province || !input.city || !input.address.trim())) return "Completá la provincia, la localidad y la calle de la sucursal.";
  if (!/^#[\da-f]{6}$/i.test(input.color)) return "Elegí un color de marca válido.";
  return null;
}

export async function createStorefront(input: StorefrontInput): Promise<ActionResult<null>> {
  await wait();
  const { error, ctx } = requireAdmin(getState());
  if (error) return error;
  const invalid = validateStorefront(input);
  if (invalid) return fail(invalid);
  updateState((draft) => {
    const id = makeId("sf");
    draft.storefronts.push({
      id,
      orgId: ctx.org.id,
      name: input.name.trim(),
      online: input.online,
      address: input.online ? null : input.address.trim(),
      city: input.online ? null : input.city,
      province: input.online ? null : input.province,
      category: input.category.trim() || null,
      color: input.color,
      hours: input.hours.trim() || null,
      description: input.description.trim() || null,
      active: true,
    });
    // Admins operate every storefront of their organization.
    for (const member of draft.staff) if (member.role === UserRole.ADMIN) member.storefrontIds.push(id);
  });
  return ok(null);
}

export async function updateStorefront(storefrontId: string, input: StorefrontInput): Promise<ActionResult<null>> {
  await wait();
  const { error, ctx } = requireAdmin(getState());
  if (error) return error;
  const invalid = validateStorefront(input);
  if (invalid) return fail(invalid);
  if (!input.active && ctx.storefront?.id === storefrontId) return fail("No podés desactivar el local en el que tenés la sesión abierta. Cambiá de local primero.", 409);
  updateState((draft) => {
    const sf = draft.storefronts.find((s) => s.id === storefrontId);
    if (!sf) return;
    Object.assign(sf, {
      name: input.name.trim(),
      online: input.online,
      address: input.online ? null : input.address.trim(),
      city: input.online ? null : input.city,
      province: input.online ? null : input.province,
      category: input.category.trim() || null,
      color: input.color,
      hours: input.hours.trim() || null,
      description: input.description.trim() || null,
      active: input.active,
    });
  });
  return ok(null);
}

export async function deactivateStorefront(storefrontId: string): Promise<ActionResult<null>> {
  await wait();
  const { error, ctx } = requireAdmin(getState());
  if (error) return error;
  if (ctx.storefront?.id === storefrontId) return fail("No podés desactivar el local en el que tenés la sesión abierta. Cambiá de local primero.", 409);
  updateState((draft) => {
    const sf = draft.storefronts.find((s) => s.id === storefrontId);
    if (sf) sf.active = false;
  });
  return ok(null);
}

export type ProgramInput = { name: string; unitLabel: string; storefrontIds: string[]; active: boolean; expirationMonths: PointExpirationMonths };

export async function createPointProgram(input: ProgramInput): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const { error, ctx } = requireAdmin(state);
  if (error) return error;
  if (input.name.trim().length < 2) return fail("Ingresá un nombre para el programa.");
  if (input.storefrontIds.length === 0) return fail("Elegí al menos una sucursal.");
  const taken = input.storefrontIds.find((id) => programOfStorefront(state, id));
  if (taken) return fail("Una de las sucursales ya pertenece a otro programa.", 409);
  updateState((draft) => {
    draft.programs.push({
      id: makeId("pp"),
      orgId: ctx.org.id,
      name: input.name.trim(),
      unitLabel: input.unitLabel.trim() || null,
      active: true,
      expirationMonths: null,
      storefrontIds: input.storefrontIds,
    });
  });
  return ok(null);
}

export async function updatePointProgram(programId: string, input: ProgramInput): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const { error } = requireAdmin(state);
  if (error) return error;
  if (input.name.trim().length < 2) return fail("Ingresá un nombre para el programa.");
  const taken = input.storefrontIds.find((id) => {
    const owner = programOfStorefront(state, id);
    return owner && owner.id !== programId;
  });
  if (taken) return fail("Una de las sucursales ya pertenece a otro programa.", 409);
  updateState((draft) => {
    const program = draft.programs.find((p) => p.id === programId);
    if (!program) return;
    const previous = program.expirationMonths;
    program.name = input.name.trim();
    program.unitLabel = input.unitLabel.trim() || null;
    program.active = input.active;
    program.storefrontIds = input.storefrontIds;
    program.expirationMonths = input.expirationMonths;

    const expired = new Set(draft.transactions.filter((t) => t.kind === "expire").map((t) => t.correctsId));
    const grants = draft.transactions.filter((t) => t.programId === programId && t.kind === "grant" && t.points > 0 && !expired.has(t.id));
    if (input.expirationMonths === null) {
      // Disabling removes deadlines not processed yet; already expired points stay expired.
      for (const tx of grants) tx.expiresAt = null;
    } else if (previous === null) {
      // Enabling also applies to earlier points without a deadline (they may expire right away).
      for (const tx of grants) if (!tx.expiresAt) tx.expiresAt = addMonths(tx.createdAt, input.expirationMonths);
    }
  });
  return ok(null);
}

/* ================================================================== */
/* Staff                                                               */
/* ================================================================== */

export async function searchStaffCandidates({ search, page, size }: SearchOptions): Promise<PagedResponse<CustomerOption>> {
  await wait(220);
  const state = getState();
  const query = normalize(search);
  const staffUsernames = new Set(state.staff.filter((s) => s.active).map((s) => s.username));
  const matches = state.customers
    .filter((c) => !staffUsernames.has(c.username) && normalize(`${c.name} ${c.username} ${c.email}`).includes(query))
    .map((c) => ({ id: c.id, name: c.name, username: c.username, email: c.email, points: null }));
  return paginate(matches, page, size);
}

export async function addCashier({ userId, storefrontId }: { userId: string; storefrontId: string }): Promise<ActionResult<null>> {
  await wait(450);
  const state = getState();
  const { error, ctx } = requireAdmin(state);
  if (error) return error;
  const customer = state.customers.find((c) => c.id === userId);
  if (!customer) return fail("No encontramos esa cuenta.", 404);
  if (state.staff.some((s) => s.active && s.username === customer.username)) return fail("Esa persona ya forma parte del equipo.", 409);
  updateState((draft) => {
    const existing = draft.staff.find((s) => s.username === customer.username);
    const now = new Date().toISOString();
    const member: StaffMember = existing ?? {
      id: makeId("st"),
      userId: customer.id,
      username: customer.username,
      name: customer.name,
      email: customer.email,
      emailVerified: customer.emailVerified,
      password: customer.password,
      role: UserRole.CASHIER,
      active: true,
      storefrontIds: [storefrontId],
      createdAt: now,
    };
    if (existing) {
      existing.active = true;
      existing.role = UserRole.CASHIER;
      existing.storefrontIds = [storefrontId];
      existing.createdAt = now;
    } else {
      draft.staff.push(member);
    }
    draft.audit.push(auditForStaffCreate(draft, member, storefrontId, ctx.member.id, now));
  });
  return ok(null);
}

export async function removeStaffMember(memberId: string): Promise<ActionResult<null>> {
  await wait(450);
  const state = getState();
  const { error, ctx } = requireAdmin(state);
  if (error) return error;
  if (memberId === ctx.member.id) return fail("No podés quitarte a vos mismo del equipo.", 409);
  updateState((draft) => {
    const member = draft.staff.find((s) => s.id === memberId);
    if (!member) return;
    member.active = false;
    draft.audit.push(auditForSessionRevoke(draft, ctx.org.id, ctx.member.id, member.id));
  });
  return ok(null);
}

/* ================================================================== */
/* Audit                                                               */
/* ================================================================== */

export async function getAuditRecords(filters: { originatingUserId?: string; affectedUserId?: string; operationType?: OperationType }): Promise<ActionResult<AuditRecord[]>> {
  await wait(450);
  const state = getState();
  const { error, ctx } = requireAdmin(state);
  if (error) return error;
  if (filters.operationType === "USER_CREATE") return ok([]);
  return ok(
    state.audit
      .filter(
        (r) =>
          r.orgId === ctx.org.id &&
          (!filters.operationType || r.operationType === filters.operationType) &&
          (!filters.originatingUserId || r.originatingUser.id === filters.originatingUserId) &&
          (!filters.affectedUserId || r.affectedUsers.some((u) => u.id === filters.affectedUserId)),
      )
      .map(({ orgId: _orgId, ...record }) => record as AuditRecord),
  );
}

export async function searchAuditUsers({ search, page, size }: SearchOptions): Promise<PagedResponse<AuditUser>> {
  await wait(220);
  const state = getState();
  const query = normalize(search);
  const users: AuditUser[] = [
    ...state.staff.map((s) => ({ id: s.id, name: s.name, username: s.email })),
    ...state.customers.map((c) => ({ id: c.id, name: c.name, username: c.email })),
  ].filter((u) => normalize(`${u.name ?? ""} ${u.username ?? ""}`).includes(query));
  return paginate(users, page, size);
}

/* ================================================================== */
/* Staff profile                                                       */
/* ================================================================== */

export type AdminUserInfo = { username: string; name: string; role: UserRole; email: string; emailVerified: boolean };

export async function updateStaffProfile(input: { name: string; email: string }): Promise<ActionResult<AdminUserInfo>> {
  await wait();
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx) return fail("Tu sesión expiró.", 401);
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return fail("Ingresá tu nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Ingresá un email válido.");
  const changed = email !== ctx.member.email;
  updateState((draft) => {
    const member = draft.staff.find((s) => s.id === ctx.member.id)!;
    member.name = name;
    member.email = email;
    if (changed) member.emailVerified = false;
  });
  return ok({ username: ctx.member.username, name, role: ctx.member.role, email, emailVerified: changed ? false : ctx.member.emailVerified });
}

export async function updateStaffPassword(input: { currentPassword: string; newPassword: string }): Promise<ActionResult<null>> {
  await wait();
  const state = getState();
  const ctx = staffContext(state);
  if (!ctx) return fail("Tu sesión expiró.", 401);
  if (ctx.member.password !== input.currentPassword) return fail("La contraseña actual no es correcta.", 401);
  if (input.newPassword.length < 8) return fail("La contraseña nueva debe tener al menos 8 caracteres.");
  updateState((draft) => {
    draft.staff.find((s) => s.id === ctx.member.id)!.password = input.newPassword;
  });
  return ok(null);
}

/* ================================================================== */
/* Billing                                                             */
/* ================================================================== */

export async function getDashboardBilling() {
  await wait(500);
  const state = getState();
  const { error, ctx } = requireAdmin(state);
  if (error) return { organization: error, invoices: error };
  return {
    organization: ok({
      name: ctx.org.name,
      billingPlanName: state.billing.planName,
      billingCycle: state.billing.cycle,
      mercadoPagoSubscriptionStatus: state.billing.subscriptionStatus,
      nextInvoiceDueAt: state.billing.nextInvoiceDueAt,
    }),
    invoices: ok(state.billing.invoices),
  };
}
