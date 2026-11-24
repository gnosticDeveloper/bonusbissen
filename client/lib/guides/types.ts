import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/types/user";

/** What a guide's text may depend on. */
export type GuideContext = { role: UserRole };

type GuideBody = ReactNode | ((context: GuideContext) => ReactNode);

/**
 * One step of a view's tour. `id` is stored in the "seen" cookie, so it must never change once
 * shipped: renaming it shows the step again to everyone. New steps get new ids; they reach users
 * who already finished the tour as "Nuevo", and new users see them in order with the rest.
 */
export type GuideStep = {
  id: string;
  /** Element marked with `data-guide="<target>"`. Steps without a target show as a centered card. */
  target?: string;
  title: string;
  body: GuideBody;
  /** Limits the step to these roles; omitted means every role that can open the view. */
  roles?: UserRole[];
  /**
   * When the step was added (`YYYY-MM-DD`), for steps added after the view's tour first shipped.
   * Users who already went through the tour see it marked "Nuevo"; leave it out on the original steps.
   */
  addedOn?: string;
};

/** A one-off hint anchored to an element. Shown after the view's tour, one at a time, until closed. */
export type GuideTip = {
  id: string;
  target: string;
  body: GuideBody;
  roles?: UserRole[];
};

export type ViewGuide = {
  /** Stable key, also the prefix of the stored step and tip ids. */
  id: string;
  /** Route under `/d/[slug]`, e.g. `/inicio`. */
  path: string;
  title: string;
  /** One sentence for the Help page. */
  summary: string;
  icon: LucideIcon;
  roles: UserRole[];
  steps: GuideStep[];
  tips: GuideTip[];
};

export function renderGuideBody(body: GuideBody, context: GuideContext): ReactNode {
  return typeof body === "function" ? body(context) : body;
}

export function appliesToRole(item: { roles?: UserRole[] }, role: UserRole): boolean {
  return !item.roles || item.roles.includes(role);
}
