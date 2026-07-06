'use client';

import { useState } from 'react';

import Toggle from '@/components/ui/Toggle';
import { useOrigin } from '@/components/ui/useOrigin';

import { shareApi, tripsApi } from './api';
import styles from './ShareCard.module.css';

interface ShareCardProps {
  tripId: string;
  isPublic: boolean;
  isFeatured: boolean;
  shareToken: string | null;
}

export default function ShareCard({
  tripId,
  isPublic: initialPublic,
  isFeatured: initialFeatured,
  shareToken: initialToken,
}: ShareCardProps) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [isFeatured, setIsFeatured] = useState(initialFeatured);
  const [shareToken, setShareToken] = useState(initialToken);
  const origin = useOrigin();
  const [busyPublic, setBusyPublic] = useState(false);
  const [busyFeatured, setBusyFeatured] = useState(false);
  const [busyLink, setBusyLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePublic() {
    const next = !isPublic;
    setBusyPublic(true);
    setError(null);
    const result = await tripsApi.update(tripId, { isPublic: next });
    setBusyPublic(false);
    if (!result.ok) {
      setError('Could not update globe visibility.');
      return;
    }
    setIsPublic(next);
  }

  async function toggleFeatured() {
    const next = !isFeatured;
    setBusyFeatured(true);
    setError(null);
    const result = await tripsApi.update(tripId, { isFeatured: next });
    setBusyFeatured(false);
    if (!result.ok) {
      setError('Could not update featured status.');
      return;
    }
    setIsFeatured(next);
  }

  async function toggleLink() {
    setBusyLink(true);
    setError(null);
    if (shareToken) {
      if (!window.confirm('Revoke this link? Anyone with it will lose access.')) {
        setBusyLink(false);
        return;
      }
      const result = await shareApi.revoke(tripId);
      setBusyLink(false);
      if (!result.ok) {
        setError('Could not revoke the link.');
        return;
      }
      setShareToken(null);
      return;
    }
    const result = await shareApi.create(tripId);
    setBusyLink(false);
    if (!result.ok || !result.data) {
      setError('Could not create a link.');
      return;
    }
    setShareToken(result.data.shareToken);
  }

  const shareUrl = shareToken ? `${origin}/t/${shareToken}` : '';

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.heading}>Sharing</h2>

      <div className={styles.row}>
        <div>
          <p className={styles.rowTitle}>Show on public globe</p>
          <p className={styles.rowHint}>
            Appears on your public globe (turn the globe on in Settings).
          </p>
        </div>
        <Toggle
          on={isPublic}
          busy={busyPublic}
          onClick={togglePublic}
          label="Show on public globe"
        />
      </div>

      <div className={styles.row}>
        <div>
          <p className={styles.rowTitle}>Feature on your home</p>
          <p className={styles.rowHint}>
            Shows as a Featured journey on your globe home — up to 3.
          </p>
        </div>
        <Toggle
          on={isFeatured}
          busy={busyFeatured}
          onClick={toggleFeatured}
          label="Feature on your home"
        />
      </div>

      <div className={styles.row}>
        <div>
          <p className={styles.rowTitle}>Shareable link</p>
          <p className={styles.rowHint}>
            Anyone with the link can view this memory. Revocable.
          </p>
        </div>
        <Toggle
          on={Boolean(shareToken)}
          busy={busyLink}
          onClick={toggleLink}
          label="Shareable link"
        />
      </div>

      {shareToken && (
        <div className={styles.linkRow}>
          <input className={styles.linkInput} readOnly value={shareUrl} />
          <button type="button" className={styles.copyButton} onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
