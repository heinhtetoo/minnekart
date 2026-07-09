'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, forwardRef, useImperativeHandle, useState } from 'react';

import { authApi } from './api';

type Mode = 'login' | 'signup' | 'forgot' | 'forgotSent';

export interface AuthCardHandle {
  openSignup: () => void;
  openLogin: () => void;
}

interface AuthCardProps {
  invite?: string;
}

const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
};

const SIGNUP_ERRORS: Record<string, string> = {
  account_exists: 'That email or username is already taken.',
  invalid_invite: 'This invite link is invalid, used, or expired.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  invalid_request: 'Please check your details and try again.',
};

const AuthCard = forwardRef<AuthCardHandle, AuthCardProps>(function AuthCard(
  { invite },
  ref,
) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(invite ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    openSignup: () => {
      setMode('signup');
      setError('');
    },
    openLogin: () => {
      setMode('login');
      setError('');
    },
  }));

  function resetFeedback() {
    setError('');
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    setBusy(true);
    const result = await authApi.login(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(LOGIN_ERRORS[result.error ?? ''] ?? 'Could not sign in.');
  }

  async function onSignup(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!invite) {
      setError('Signups are invite-only. Ask your host for an invite link.');
      return;
    }
    setBusy(true);
    const result = await authApi.signup({
      email: email.trim(),
      username: username.trim().toLowerCase(),
      name: name.trim(),
      password,
      invite,
    });
    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(SIGNUP_ERRORS[result.error ?? ''] ?? 'Could not create account.');
  }

  async function onForgot(event: FormEvent) {
    event.preventDefault();
    resetFeedback();
    setBusy(true);
    await authApi.forgot(email.trim());
    setBusy(false);
    setMode('forgotSent');
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '24px 26px 22px',
        border: '1px solid rgba(28,25,23,.07)',
        boxShadow: '0 10px 34px rgba(28,25,23,.09)',
      }}
    >
      {(mode === 'login' || mode === 'signup') && (
        <div
          style={{
            display: 'flex',
            gap: 5,
            padding: 4,
            background: '#ece5d8',
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <Tab
            active={mode === 'login'}
            label="Sign in"
            onClick={() => {
              setMode('login');
              resetFeedback();
            }}
          />
          <Tab
            active={mode === 'signup'}
            label="Create account"
            onClick={() => {
              setMode('signup');
              resetFeedback();
            }}
          />
        </div>
      )}

      {mode === 'login' && (
        <form className="fade" onSubmit={onLogin}>
          <Heading
            title="Welcome back"
            subtitle="Sign in to open your globe."
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
              }}
            >
              <span className="label" style={{ margin: 0 }}>
                Password
              </span>
              <button
                type="button"
                className="authlink"
                style={{ fontSize: 11.5 }}
                onClick={() => {
                  setMode('forgot');
                  resetFeedback();
                }}
              >
                Forgot?
              </button>
            </div>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <ErrorLine error={error} />
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {mode === 'signup' && (
        <form className="fade" onSubmit={onSignup}>
          <Heading
            title="Start your Minnekart"
            subtitle="Pin your first place today."
          />
          {!invite && (
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--muted)',
                background: '#f4efe6',
                padding: '10px 12px',
                borderRadius: 9,
                margin: '0 0 14px',
                lineHeight: 1.5,
              }}
            >
              Minnekart is invite-only for now. Open your invite link to create
              an account.
            </p>
          )}
          <Field
            label="Full name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Sofia Marchetti"
            autoComplete="name"
          />
          <Field
            label="Username"
            type="text"
            value={username}
            onChange={setUsername}
            placeholder="sofia"
            autoComplete="username"
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
          <ErrorLine error={error} />
          <button className="button" type="submit" disabled={busy || !invite}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form className="fade" onSubmit={onForgot}>
          <Heading
            title="Reset your password"
            subtitle="We'll email you a link to set a new one."
          />
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <ErrorLine error={error} />
          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <BackToSignIn onClick={() => setMode('login')} />
        </form>
      )}

      {mode === 'forgotSent' && (
        <div className="fade" style={{ textAlign: 'center' }}>
          <Heading title="Check your inbox" subtitle="" center />
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              lineHeight: 1.6,
              margin: '0 0 18px',
            }}
          >
            If an account exists for <b>{email}</b>, a reset link is on its way.
            It expires in 30 minutes.
          </p>
          <BackToSignIn onClick={() => setMode('login')} />
        </div>
      )}
    </div>
  );
});

export default AuthCard;

function Tab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        padding: 9,
        borderRadius: 9,
        cursor: 'pointer',
        border: 'none',
        fontFamily: 'inherit',
        background: active ? '#fff' : 'transparent',
        color: active ? 'var(--forest)' : 'var(--muted)',
        boxShadow: active ? '0 1px 4px rgba(28,25,23,.08)' : 'none',
        transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function Heading({
  title,
  subtitle,
  center,
}: {
  title: string;
  subtitle: string;
  center?: boolean;
}) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>
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
      {subtitle && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 18px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="label">{label}</label>
      <input
        className="field"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function ErrorLine({ error }: { error: string }) {
  return (
    <div className="fieldError" style={{ minHeight: 18, marginBottom: 4 }}>
      {error}
    </div>
  );
}

function BackToSignIn({ onClick }: { onClick: () => void }) {
  return (
    <p
      style={{
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--muted)',
        margin: '16px 0 0',
      }}
    >
      <button type="button" className="authlink" onClick={onClick}>
        Back to sign in
      </button>
    </p>
  );
}
