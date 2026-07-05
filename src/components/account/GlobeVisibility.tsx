'use client';

import { useState } from 'react';

import Toggle from '@/components/ui/Toggle';
import { useOrigin } from '@/components/ui/useOrigin';

import { accountApi } from './api';
import styles from './GlobeVisibility.module.css';

interface GlobeVisibilityProps {
  initialPublic: boolean;
  username: string;
}

export default function GlobeVisibility({
  initialPublic,
  username,
}: GlobeVisibilityProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const origin = useOrigin();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !isPublic;
    setBusy(true);
    setError(null);
    const result = await accountApi.setGlobePublic(next);
    setBusy(false);
    if (!result.ok) {
      setError('Could not update your globe.');
      return;
    }
    setIsPublic(next);
  }

  const globeUrl = `${origin}/u/${username}`;

  async function copyLink() {
    await navigator.clipboard.writeText(globeUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <div>
          <p className={styles.rowTitle}>Make my globe public</p>
          <p className={styles.rowHint}>
            Anyone with your link can see the memories you mark public. Private
            memories stay hidden.
          </p>
        </div>
        <Toggle
          on={isPublic}
          busy={busy}
          onClick={toggle}
          label="Make my globe public"
        />
      </div>

      {isPublic && (
        <div className={styles.linkRow}>
          <input className={styles.linkInput} readOnly value={globeUrl} />
          <button type="button" className={styles.copyButton} onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
