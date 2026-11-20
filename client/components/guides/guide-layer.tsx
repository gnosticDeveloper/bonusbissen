"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { GUIDE_ROOT_ID, findGuideTarget, waitForSettle } from "@/lib/guides/dom";
import { guideKey, markSeen, readSeen } from "@/lib/guides/storage";
import { useGuideReplay } from "@/lib/guides/store";
import { appliesToRole, type GuideTip as Tip } from "@/lib/guides/types";
import { findViewGuide } from "@/lib/guides/views";
import { readGuidesEnabled } from "@/lib/preferences/guides";
import type { UserRole } from "@/lib/types/user";
import { GuideTip } from "./guide-tip";
import { GuideTour, type TourMode, type TourStep } from "./guide-tour";

/** Theme default for `--primary` (app/globals.css), used when the storefront has no brand color. */
const DEFAULT_PRIMARY = "#d4822b";
/** Pause between one tip closing (or the tour ending) and the next tip appearing. */
const TIP_DELAY_MS = 700;

type TourState = { viewId: string; steps: TourStep[]; mode: TourMode };

type GuideLayerProps = {
  role: UserRole;
  /** The selected storefront's color, already validated by the shell. */
  color: string | null;
};

/**
 * Runs the dashboard guides for the current view: once the page settles, the tour shows the steps
 * this device hasn't seen; when the tour is done (or there's nothing new), tips appear one at a
 * time as their targets show up. Lives inside the dashboard shell so everything it renders inherits
 * the storefront's `--primary`, and only there: customer pages and sign-in never mount it.
 */
export function GuideLayer({ role, color }: GuideLayerProps) {
  const pathname = usePathname();
  const view = useMemo(() => findViewGuide(pathname, role), [pathname, role]);
  const viewId = view?.id ?? null;
  const context = useMemo(() => ({ role }), [role]);

  const [tour, setTour] = useState<TourState | null>(null);
  // Which view finished its tour phase in this visit; tips wait for it.
  const [tipsFor, setTipsFor] = useState<string | null>(null);
  const [tip, setTip] = useState<{ viewId: string; tip: Tip } | null>(null);

  // State left over from another view is ignored rather than reset, so navigating never flashes it.
  const activeTour = tour && tour.viewId === viewId ? tour : null;
  const activeTip = tip && tip.viewId === viewId && tipsFor === viewId ? tip.tip : null;

  // Tour phase: wait for the page to finish loading, then decide what to show.
  useEffect(() => {
    if (!view) return;
    const controller = new AbortController();
    waitForSettle(controller.signal)
      .then(() => {
        const replaying = useGuideReplay.getState().replay === view.id;
        if (replaying) useGuideReplay.getState().consumeReplay();
        // Turned off in Configuración: only a guide asked for from Ayuda shows.
        if (!replaying && !readGuidesEnabled()) return;

        const seen = readSeen("steps");
        const steps = view.steps.filter((step) => appliesToRole(step, role));
        const seenBefore = steps.some((step) => seen.has(guideKey(view.id, step.id)));
        const pending = steps.filter(
          // A step whose target isn't on screen stays unseen and waits for a visit where it is.
          (step) => (replaying || !seen.has(guideKey(view.id, step.id))) && (!step.target || findGuideTarget(step.target)),
        );

        if (pending.length === 0) {
          setTipsFor(view.id);
          return;
        }
        const mode: TourMode = replaying ? "replay" : seenBefore ? "update" : "first";
        // Only steps declared as added later read "Nuevo"; others may just have had no target on an earlier visit.
        setTour({ viewId: view.id, mode, steps: pending.map((step) => ({ ...step, isNew: mode === "update" && Boolean(step.addedOn) })) });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [view, role]);

  const markStepShown = useCallback(
    (step: TourStep) => {
      if (viewId) markSeen("steps", [guideKey(viewId, step.id)]);
    },
    [viewId],
  );

  const closeTour = useCallback(() => {
    if (!activeTour) return;
    // Skipping counts as seen: the steps stay one tap away in Ayuda.
    markSeen("steps", activeTour.steps.map((step) => guideKey(activeTour.viewId, step.id)));
    setTour(null);
    setTipsFor(activeTour.viewId);
  }, [activeTour]);

  // Tips phase: show the first unseen tip whose target is on the page, watching for new targets.
  useEffect(() => {
    if (!view || tipsFor !== view.id || activeTip || !readGuidesEnabled()) return;
    const tips = view.tips.filter((candidate) => appliesToRole(candidate, role));
    if (tips.length === 0) return;

    let timer = 0;
    let frame = 0;
    const check = () => {
      const seen = readSeen("tips");
      if (tips.every((candidate) => seen.has(guideKey(view.id, candidate.id)))) {
        observer.disconnect();
        return;
      }
      const next = tips.find((candidate) => !seen.has(guideKey(view.id, candidate.id)) && findGuideTarget(candidate.target));
      window.clearTimeout(timer);
      if (next) timer = window.setTimeout(() => setTip({ viewId: view.id, tip: next }), TIP_DELAY_MS);
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [view, role, tipsFor, activeTip]);

  const closeTip = useCallback(() => {
    if (!tip) return;
    markSeen("tips", [guideKey(tip.viewId, tip.tip.id)]);
    setTip(null);
  }, [tip]);

  return (
    <>
      <div id={GUIDE_ROOT_ID} />
      <AnimatePresence>
        {activeTour ? (
          <GuideTour
            key={`${activeTour.viewId}:${activeTour.mode}`}
            steps={activeTour.steps}
            mode={activeTour.mode}
            context={context}
            onStepShown={markStepShown}
            onClose={closeTour}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {activeTip && !activeTour ? (
          <GuideTip key={`${viewId}:${activeTip.id}`} tip={activeTip} context={context} color={color ?? DEFAULT_PRIMARY} onClose={closeTip} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
