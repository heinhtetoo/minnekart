'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import form from '@/components/ui/Form.module.css';

import styles from './Admin.module.css';
import { invitesApi } from './api';

export default function InviteManager() {
  const router = useRouter();
  const noteId = useId();
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
        <div className={styles.noteField}>
          <label className={`${form.label} ${styles.label}`} htmlFor={noteId}>
            Note (optional)
          </label>
          <input
            id={noteId}
            className={`${form.field} ${styles.noteInput}`}
            placeholder="e.g. for Sofia"
            value={note}
            maxLength={100}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
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
        <div className={styles.linkBox}>
          <p className={styles.linkHint}>
            Copy this link now — it won’t be shown again.
          </p>
          <div className={styles.linkRow}>
            <input
              className={`${form.field} ${styles.linkInput}`}
              readOnly
              value={link}
              aria-label="Invite link"
            />
            <button
              type="button"
              className={
                copied
                  ? `${styles.copyButton} ${styles.copied}`
                  : styles.copyButton
              }
              onClick={copyLink}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.hint}>
          Invites expire in 14 days and can be used once.
        </p>
      )}

      {/* Announces "Copied" and the error to screen readers; the error also
          shows here. */}
      <div aria-live="polite">
        {copied && <span className={styles.srOnly}>Copied</span>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </section>
  );
}
