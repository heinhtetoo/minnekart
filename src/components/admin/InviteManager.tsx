'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import styles from './Admin.module.css';
import { invitesApi } from './api';

export default function InviteManager() {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    const trimmed = note.trim();
    const result = await invitesApi.create(trimmed || undefined);
    setBusy(false);
    if (!result.ok || !result.data) {
      setError('Could not create an invite.');
      return;
    }
    setLink(result.data.url);
    setNote('');
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={styles.card}>
      <div className={styles.form}>
        <input
          className={styles.noteInput}
          placeholder="Note (optional) — e.g. for Sofia"
          value={note}
          maxLength={100}
          onChange={(event) => setNote(event.target.value)}
        />
        <button
          type="button"
          className={styles.generateButton}
          onClick={generate}
          disabled={busy}
        >
          {busy ? 'Generating…' : 'Generate invite'}
        </button>
      </div>

      {link ? (
        <>
          <p className={styles.hint}>
            Copy this link now — it won’t be shown again.
          </p>
          <div className={styles.linkRow}>
            <input className={styles.linkInput} readOnly value={link} />
            <button
              type="button"
              className={styles.copyButton}
              onClick={copyLink}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.hint}>
          Invites expire in 14 days and can be used once.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
