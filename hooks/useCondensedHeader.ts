'use client';

import { useSyncExternalStore } from 'react';

/**
 * Shared "is the sticky chrome condensed?" flag, driven by scroll direction.
 *
 * The catalogue stacks a lot of sticky chrome (top bar + dates + search + sets +
 * categories), which on a laptop leaves only a sliver of the item grid. Scrolling
 * *down* past the fold condenses it — the top bar slides away and the secondary
 * rows collapse; any scroll *up*, or returning near the top, brings it all back.
 *
 * Implemented as a module-level store rather than per-component state so the top
 * bar and the catalogue header can never disagree about the current state (they
 * live in different subtrees), and so only one scroll listener is attached.
 */

/** Don't condense until the user is meaningfully past the top of the page. */
const ENGAGE_AT = 120;
/** Ignore scroll jitter (trackpad rubber-banding, tap-induced 1px scrolls). */
const HYSTERESIS = 10;
/**
 * Collapsing the rows removes flow height, which can nudge the scroll position
 * near the end of the document and read as an upward scroll. Ignore movement for
 * a moment after each flip so that can't oscillate.
 */
const SETTLE_MS = 250;

let condensed = false;
let lastY = 0;
let settledAt = 0;
let ticking = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === condensed) return;
  condensed = next;
  settledAt = performance.now() + SETTLE_MS;
  listeners.forEach((notify) => notify());
}

function evaluate() {
  ticking = false;
  const y = Math.max(0, window.scrollY);

  if (y <= ENGAGE_AT) {
    lastY = y;
    set(false);
    return;
  }
  if (performance.now() < settledAt) return;

  const delta = y - lastY;
  // Leave lastY alone below the threshold so slow drags still accumulate.
  if (Math.abs(delta) < HYSTERESIS) return;
  lastY = y;
  set(delta > 0);
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(evaluate);
}

function subscribe(notify: () => void) {
  if (listeners.size === 0) {
    lastY = Math.max(0, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      window.removeEventListener('scroll', onScroll);
      // Start expanded again on the next mount (e.g. after a route change).
      condensed = false;
      settledAt = 0;
    }
  };
}

export function useCondensedHeader(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => condensed,
    () => false,
  );
}
