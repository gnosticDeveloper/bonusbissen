/** DOM lookups shared by the tour and the tips. Browser only. */

/** Id of the element inside the dashboard shell that guide portals render into. */
export const GUIDE_ROOT_ID = "guide-root";

/**
 * The visible element marked `data-guide="<name>"` (the attribute may hold several space-separated
 * names). Hidden copies are skipped: the sidebar renders twice, once inside the closed mobile drawer.
 */
export function findGuideTarget(name: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-guide~="${CSS.escape(name)}"]`);
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    const onScreenHorizontally = rect.right > 0 && rect.left < window.innerWidth;
    if (rect.width > 0 && rect.height > 0 && onScreenHorizontally && !element.closest("[inert]")) return element;
  }
  return null;
}

/** Whether the target is at least partly inside the viewport and not scrolled out of its container. */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return false;
  // Scrolled out of a clipping ancestor (e.g. a list inside a card).
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll|hidden)/.test(style.overflowY + style.overflowX)) {
      const box = parent.getBoundingClientRect();
      if (rect.bottom <= box.top || rect.top >= box.bottom || rect.right <= box.left || rect.left >= box.right) return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

/** Streaming sections still show skeletons, or a client page is still loading. */
function isPageBusy(): boolean {
  const main = document.querySelector("main");
  return Boolean(main?.querySelector('[aria-busy="true"], .animate-pulse'));
}

/**
 * Resolves once the page stops changing: no DOM mutations for `quietMs` and nothing still loading,
 * or after `maxMs` regardless. Streamed server sections and client fetches finish at different
 * times, so a fixed delay would start the tour before some targets exist.
 */
export function waitForSettle(signal: AbortSignal, { minMs = 500, quietMs = 600, maxMs = 6000 } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    let lastChange = startedAt;
    const observer = new MutationObserver(() => {
      lastChange = performance.now();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-busy", "class"] });

    const interval = window.setInterval(() => {
      const now = performance.now();
      const settled = now - startedAt >= minMs && now - lastChange >= quietMs && !isPageBusy();
      if (settled || now - startedAt >= maxMs) {
        cleanup();
        resolve();
      }
    }, 100);

    const cleanup = () => {
      observer.disconnect();
      window.clearInterval(interval);
    };

    signal.addEventListener("abort", () => {
      cleanup();
      reject(signal.reason);
    }, { once: true });
  });
}
