"use client";

import { create } from "zustand";

/**
 * A tour the Help page asked to replay. It survives the client-side navigation to the view; the
 * guide layer consumes it once that view has loaded and then shows every step, seen or not.
 */
interface GuideReplayState {
  replay: string | null;
  requestReplay: (viewId: string) => void;
  consumeReplay: () => string | null;
}

export const useGuideReplay = create<GuideReplayState>()((set, get) => ({
  replay: null,
  requestReplay: (viewId) => set({ replay: viewId }),
  consumeReplay: () => {
    const { replay } = get();
    if (replay) set({ replay: null });
    return replay;
  },
}));
