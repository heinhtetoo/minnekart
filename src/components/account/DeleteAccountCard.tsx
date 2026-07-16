'use client';

import { useState } from 'react';

import { accountApi } from './api';
import styles from './DeleteAccountCard.module.css';

interface DeleteAccountCardProps {
  username: string;
}

export default function DeleteAccountCard({
  username,
}: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = confirmName === username && password.length > 0;

  async function remove() {
    if (!ready) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await accountApi.deleteAccount(password);
    if (result.ok) {
      window.location.assign('/');
      return;
    }
    setBusy(false);
    setError(
      result.error === 'invalid_password'
        ? 'That password is not right.'
        : 'Could not delete your account. Please try again.',
    );
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Delete account</h2>
      <p className={styles.hint}>
        Permanently delete your account, every memory and every photo. This
        cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setOpen(true)}
        >
          Delete account
        </button>
      ) : (
        <div className={styles.confirm}>
          <label className={styles.label}>
            Type your username <strong>{username}</strong> to confirm
            <input
              className={styles.input}
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className={styles.label}>
            Your password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.danger}
              disabled={!ready || busy}
              onClick={remove}
            >
              {busy ? 'Deleting…' : 'Delete forever'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
