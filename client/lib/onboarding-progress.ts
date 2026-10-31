export type OnboardingProgress = {
  version: 3;
  userId: string;
  organizationId: string | null;
  step: number;
};

/** Storage is replaceable; callers must await operations in navigation order. */
export interface OnboardingProgressStore {
  load(userId: string): Promise<OnboardingProgress | null>;
  save(userId: string, progress: OnboardingProgress): Promise<void>;
  clear(userId: string): Promise<void>;
}

type VerifiedState = {
  userId: string | null;
  organizationId: string | null;
  organization: { id: string; billingPlanName?: string | null; mercadoPagoSubscriptionStatus?: string | null } | null;
  storefronts: readonly unknown[];
};

export function availableStep(state: VerifiedState) {
  return !state.organization ? 0 : !state.organization.billingPlanName ? 1 : state.organization.mercadoPagoSubscriptionStatus !== "authorized" ? 2 : !state.storefronts.length ? 3 : 4;
}

export function restoreStep(state: VerifiedState, saved: OnboardingProgress | null) {
  if (!saved || !state.userId || saved.userId !== state.userId || saved.organizationId !== state.organizationId) return availableStep(state);
  // Returning from Mercado Pago must not trap an authorized organization on payment.
  if ((saved.step === 1 || saved.step === 2) && availableStep(state) > saved.step) return availableStep(state);
  return clampOnboardingStep(state, saved.step);
}

export function onboardingProgressContext(state: Pick<VerifiedState, "userId" | "organizationId">) {
  return JSON.stringify([state.userId, state.organizationId]);
}

export function clampOnboardingStep(state: VerifiedState, step: number) {
  return Math.max(0, Math.min(step, availableStep(state)));
}

type NavigationSnapshot = { state: VerifiedState; step: number; revision: number };

/** A slow restore must not overwrite navigation or backend results received meanwhile. */
export async function restoreOnboardingNavigation(
  store: OnboardingProgressStore,
  initial: NavigationSnapshot,
  current: () => NavigationSnapshot,
): Promise<{ step: number; storageFailed: boolean } | null> {
  if (!initial.state.userId) return null;
  let saved: OnboardingProgress | null = null;
  let storageFailed = false;
  try { saved = await store.load(initial.state.userId); }
  catch { storageFailed = true; }
  const latest = current();
  if (onboardingProgressContext(initial.state) !== onboardingProgressContext(latest.state)) return null;
  return {
    step: latest.revision === initial.revision ? restoreStep(latest.state, saved) : clampOnboardingStep(latest.state, latest.step),
    storageFailed,
  };
}

/** The default implementation is selected here, never by the UI. */
export function createOnboardingProgressStore(adapter?: OnboardingProgressStore): OnboardingProgressStore {
  return orderedOnboardingProgressStore(adapter ?? createLocalOnboardingProgressStore());
}

export function createLocalOnboardingProgressStore(
  storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem"> = () => window.localStorage,
): OnboardingProgressStore {
  const key = (userId: string) => `onboarding-progress:v3:${encodeURIComponent(userId)}`;
  const previousKey = (userId: string) => `onboarding-progress:v2:${encodeURIComponent(userId)}`;
  const legacyKey = (userId: string) => `onboarding-progress:v1:${encodeURIComponent(userId)}`;
  return {
    async load(userId) {
      const raw = storage().getItem(key(userId)) ?? storage().getItem(previousKey(userId)) ?? storage().getItem(legacyKey(userId));
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        if (![1, 2, 3].includes(value.version) || value.userId !== userId || !(value.organizationId === null || typeof value.organizationId === "string") || !Number.isInteger(value.step) || value.step < 0 || value.step > (value.version === 1 ? 2 : value.version === 2 ? 3 : 4)) return null;
        const shift = value.version === 1 ? 2 : value.version === 2 ? 1 : 0;
        return { version: 3, userId, organizationId: value.organizationId, step: value.step > 0 ? value.step + shift : 0 };
      } catch { return null; }
    },
    async save(userId, progress) {
      if (!userId || progress.userId !== userId || !Number.isInteger(progress.step) || progress.step < 0 || progress.step > 4 || progress.version !== 3) throw new Error("Invalid onboarding progress");
      // Explicit allowlist: never serialize form fields, credentials or payment data.
      storage().setItem(key(userId), JSON.stringify({ version: 3, userId, organizationId: progress.organizationId, step: progress.step }));
      storage().removeItem(previousKey(userId));
      storage().removeItem(legacyKey(userId));
    },
    async clear(userId) { storage().removeItem(key(userId)); storage().removeItem(previousKey(userId)); storage().removeItem(legacyKey(userId)); },
  };
}

/** Serialize async adapters too, so a late save cannot resurrect cleared progress. */
export function orderedOnboardingProgressStore(store: OnboardingProgressStore): OnboardingProgressStore {
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }
  return {
    load: userId => enqueue(() => store.load(userId)),
    save: (userId, progress) => enqueue(() => store.save(userId, progress)),
    clear: userId => enqueue(() => store.clear(userId)),
  };
}

export async function completeOnboardingNavigation(
  result: { error: string | null; userId?: string; destination?: string },
  store: OnboardingProgressStore,
  navigate: (destination: string) => void,
  onClearError: (error: unknown) => void = () => {},
) {
  if (result.error !== null || !result.userId || !result.destination) return false;
  try {
    await store.clear(result.userId);
  } catch (error) {
    // Browser storage is optional, not a prerequisite for backend completion.
    onClearError(error);
  }
  navigate(result.destination);
  return true;
}
