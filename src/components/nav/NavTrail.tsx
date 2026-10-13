'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Remembers which top-level page the visitor came from before opening a trip,
// so the trip page's back link can say where it goes and return there the way
// the browser's back button would. Each history entry is stamped with its
// position, so the number of steps back (previous/next trips and the edit page
// all count) is exact, however the browser and router order their events.

export const BACK_TRAIL_KEY = 'mk-back-trail';
// Fired after each write, so a back link rendered in the same commit re-reads.
export const BACK_TRAIL_EVENT = 'mk-back-trail-change';

export interface BackTrail {
  href: string;
  label: string;
  // History position of the page to return to.
  index: number;
}

const ORIGINS: Record<string, string> = {
  '/': 'globe',
  '/timeline': 'timeline',
  '/gallery': 'gallery',
  '/profile': 'profile',
};

// Module scope: TopNav, and this component with it, remounts on every page.
let currentIndex: number | null = null;
let lastLength = 0;
let lastWasRevisit = false;

export function historyIndex(): number | null {
  const state = window.history.state as { mkIndex?: unknown } | null;
  return typeof state?.mkIndex === 'number' ? state.mkIndex : null;
}

// A new entry is one past the page we came from; a revisited entry (back,
// forward or reload) already carries its stamp. Saving a trip pushes and
// refreshes at once, which replaces the edit page's entry instead of adding
// one: history doesn't grow, so the stamp stays where it was.
function stampEntry() {
  const known = historyIndex();
  // The entry stamped a moment ago (effects run twice in development).
  if (
    known !== null &&
    known === currentIndex &&
    window.history.length === lastLength
  ) {
    return;
  }
  if (known !== null) {
    currentIndex = known;
    lastLength = window.history.length;
    lastWasRevisit = true;
    return;
  }
  const replaced =
    currentIndex !== null &&
    !lastWasRevisit &&
    window.history.length === lastLength;
  if (currentIndex === null) currentIndex = 0;
  else if (!replaced) currentIndex += 1;
  window.history.replaceState(
    { ...window.history.state, mkIndex: currentIndex },
    '',
  );
  lastLength = window.history.length;
  lastWasRevisit = false;
}

function write(trail: BackTrail | null) {
  try {
    if (trail) sessionStorage.setItem(BACK_TRAIL_KEY, JSON.stringify(trail));
    else sessionStorage.removeItem(BACK_TRAIL_KEY);
  } catch {
    // Storage blocked: the back link falls back to the globe.
  }
  window.dispatchEvent(new Event(BACK_TRAIL_EVENT));
}

export default function NavTrail() {
  const pathname = usePathname();

  useEffect(() => {
    stampEntry();
    const label = ORIGINS[pathname];
    if (label) {
      write({
        href: pathname + window.location.search,
        label,
        index: currentIndex ?? 0,
      });
    } else if (!pathname.startsWith('/trip/')) {
      // Anywhere else (settings, admin, …) is not a place to return to.
      write(null);
    }
  }, [pathname]);

  return null;
}
