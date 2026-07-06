'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { authApi } from './api';

const RESET_ERRORS: Record<string, string> = {
  invalid_token:
    'This reset link is invalid or has expired. Request a new one.',
  invalid_request: 'Please choose a password of at least 8 characters.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
};

const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: '24px 26px 22px',
  border: '1px solid rgba(28,25,23,.07)',
  boxShadow: '0 10px 34px rgba(28,25,23,.09)',
  width: 'min(100%, 400px)',
  textAlign: 'left' as const,
};

export default function ResetForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div style={cardStyle}>
        <Heading
          title="Link expired"
          subtitle="This reset link is missing or invalid. Head back and request a new one."
        />
        <BackToSignIn />
      </div>
    );
  }

  if (done) {
    return (
      <div className="fade" style={cardStyle}>
        <Heading
          title="Password updated"
          subtitle="You can now sign in with your new password."
        />
        <Link className="button" href="/" style={{ display: 'block' }}>
          Go to sign in
        </Link>
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
    <form className="fade" style={cardStyle} onSubmit={onSubmit}>
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
      <div className="fieldError" style={{ minHeight: 18, marginBottom: 4 }}>
        {error}
      </div>
      <button className="button" type="submit" disabled={busy}>
        {busy ? 'Updating…' : 'Update password'}
      </button>
      <BackToSignIn />
    </form>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2
        className="serif"
        style={{
          fontSize: 23,
          fontWeight: 600,
          color: 'var(--foreground)',
          margin: '0 0 3px',
          letterSpacing: '-0.4px',
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 18px' }}>
        {subtitle}
      </p>
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
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <input
        className="field"
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
    <p
      style={{
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--muted)',
        margin: '16px 0 0',
      }}
    >
      <Link className="authlink" href="/">
        Back to sign in
      </Link>
    </p>
  );
}
