'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';

import {
  BACK_TRAIL_EVENT,
  BACK_TRAIL_KEY,
  BackTrail,
  historyIndex,
} from '@/components/nav/NavTrail';

interface BackLinkProps {
  className?: string;
  // Used when there is no trail: a new tab, a bookmark, a link from outside.
  fallbackHref: string;
  fallbackLabel: string;
}

function subscribe(onChange: () => void) {
  window.addEventListener(BACK_TRAIL_EVENT, onChange);
  return () => window.removeEventListener(BACK_TRAIL_EVENT, onChange);
}

// The trail plus this entry's history position, as one string so the store
// snapshot stays stable between renders.
function readSnapshot(): string | null {
  try {
    const raw = sessionStorage.getItem(BACK_TRAIL_KEY);
    return raw ? `${historyIndex() ?? ''}|${raw}` : null;
  } catch {
    return null;
  }
}

// "← Back to {where you came from}", stepping back through history so the
// timeline or gallery reopens where you left it. If that page isn't behind us
// in this tab (a new tab, a bookmark, a typed address), it is the globe link.
export default function BackLink({
  className,
  fallbackHref,
  fallbackLabel,
}: BackLinkProps) {
  // The server has no trail, so it renders the fallback; the client swaps in
  // the remembered page once hydrated.
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => null);
  const target = useMemo(() => {
    if (!snapshot) return null;
    const split = snapshot.indexOf('|');
    const here = snapshot.slice(0, split);
    try {
      const trail = JSON.parse(snapshot.slice(split + 1)) as BackTrail;
      const steps = here === '' ? 0 : Number(here) - trail.index;
      return steps > 0 && steps < window.history.length
        ? { ...trail, steps }
        : null;
    } catch {
      return null;
    }
  }, [snapshot]);

  if (!target) {
    return (
      <Link href={fallbackHref} className={className}>
        {fallbackLabel}
      </Link>
    );
  }

  return (
    <Link
      href={target.href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) {
          return;
        }
        event.preventDefault();
        window.history.go(-target.steps);
      }}
    >
      ← Back to {target.label}
    </Link>
  );
}
