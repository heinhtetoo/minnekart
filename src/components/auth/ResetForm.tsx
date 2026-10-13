'use client';

import Link from 'next/link';
import { FormEvent, useId, useState } from 'react';

import form from '@/components/ui/Form.module.css';

import { authApi } from './api';
import styles from './auth.module.css';

const RESET_ERRORS: Record<string, string> = {
  invalid_token:
    'This reset link is invalid or has expired. Request a new one.',
  invalid_request: 'Please choose a password of at least 8 characters.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
};

const sheet = `${styles.sheet} ${styles.standalone}`;

export default function ResetForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className={sheet}>
        <div className={styles.body}>
          <Heading
            title="Link expired"
            subtitle="This reset link is missing or invalid. Head back and request a new one."
          />
          <BackToSignIn />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`fade ${sheet}`}>
        <div className={styles.body}>
          <Heading
            title="Password updated"
            subtitle="You can now sign in with your new password."
          />
          <Link className={`${form.button} ${styles.button}`} href="/">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    const result = await authApi.reset(token as string, password);
    setBusy(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(
      RESET_ERRORS[result.error ?? ''] ?? 'Could not reset your password.',
    );
  }

  return (
    <form className={`fade ${sheet}`} onSubmit={onSubmit}>
      <div className={styles.body}>
        <Heading
          title="Set a new password"
          subtitle="Choose a new password for your account."
        />
        <Field
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
        />
        <Field
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter password"
        />
        <div className={`${form.error} ${styles.error}`}>{error}</div>
        <button
          className={`${form.button} ${styles.button}`}
          type="submit"
          disabled={busy}
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>
        <BackToSignIn />
      </div>
    </form>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className={`serif ${styles.title}`}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div className={styles.fieldWrap}>
      <div className={styles.fieldHead}>
        <label className={`${form.label} ${styles.label}`} htmlFor={id}>
          {label}
        </label>
      </div>
      <input
        id={id}
        className={`${form.field} ${styles.field}`}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
      />
    </div>
  );
}

function BackToSignIn() {
  return (
    <p className={styles.back}>
      <Link className={`${form.link} ${styles.link}`} href="/">
        Back to sign in
      </Link>
    </p>
  );
}
