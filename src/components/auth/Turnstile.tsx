'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string) => void;
  resetNonce: number;
}

export default function Turnstile({
  siteKey,
  onToken,
  resetNonce,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.turnstile),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container || !window.turnstile) {
      return;
    }
    const widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      callback: onToken,
      'expired-callback': () => onToken(''),
    });
    widgetIdRef.current = widgetId;
    return () => {
      widgetIdRef.current = null;
      window.turnstile?.remove(widgetId);
    };
    // onToken is stable enough for the widget's lifetime; re-rendering the
    // widget on every parent render would discard the user's challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, siteKey]);

  useEffect(() => {
    if (resetNonce > 0 && widgetIdRef.current && window.turnstile) {
      onToken('');
      window.turnstile.reset(widgetIdRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  return (
    <div style={{ marginBottom: 12 }}>
      <Script src={SCRIPT_URL} onLoad={() => setReady(true)} />
      <div ref={containerRef} />
    </div>
  );
}
