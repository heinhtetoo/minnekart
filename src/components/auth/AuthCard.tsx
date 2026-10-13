'use client';

import { useRouter } from 'next/navigation';
import {
  FormEvent,
  forwardRef,
  useId,
  useImperativeHandle,
  useState,
} from 'react';

import { authApi } from './api';
import styles from './auth.module.css';
import Turnstile from './Turnstile';

type Mode = 'login' | 'signup' | 'forgot' | 'forgotSent';

export interface AuthCardHandle {
  openSignup: () => void;
  openLogin: () => void;
}

interface AuthCardProps {
  invite?: string;
  openSignup?: boolean;
  turnstileSiteKey?: string;
  startOnSignup?: boolean;
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
  captcha_failed: 'Verification failed. Please try again.',
};

const AuthCard = forwardRef<AuthCardHandle, AuthCardProps>(function AuthCard(
  { invite, openSignup = false, turnstileSiteKey, startOnSignup = false },
  ref,
) {
  const router = useRouter();
  const passwordId = useId();
  const [mode, setMode] = useState<Mode>(
    invite || startOnSignup ? 'signup' : 'login',
  );
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const canSignup = openSignup || Boolean(invite);

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
    if (!canSignup) {
      setError('Signups are invite-only. Ask your host for an invite link.');
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setError('Please complete the verification first.');
      return;
    }
    setBusy(true);
    const result = await authApi.signup({
      email: email.trim(),
      username: username.trim().toLowerCase(),
      name: name.trim(),
      password,
      invite,
      captchaToken: captchaToken || undefined,
    });
    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    if (turnstileSiteKey) {
      setCaptchaNonce((nonce) => nonce + 1);
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
    <div className={styles.sheet}>
      {(mode === 'login' || mode === 'signup') && (
        <div className={styles.tabs}>
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
        <form className={`fade ${styles.body}`} onSubmit={onLogin}>
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
          <div className={styles.fieldWrap}>
            <div className={styles.fieldHead}>
              <label className="label" htmlFor={passwordId}>
                Password
              </label>
              <button
                type="button"
                className={`authlink ${styles.forgot}`}
                onClick={() => {
                  setMode('forgot');
                  resetFeedback();
                }}
              >
                Forgot?
              </button>
            </div>
            <input
              id={passwordId}
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
        <form className={`fade ${styles.body}`} onSubmit={onSignup}>
          <Heading
            title="Start your Minnekart"
            subtitle="Pin your first place today."
          />
          {!invite && (
            <p className={styles.note}>
              {openSignup
                ? 'Free to join — 15 memories with 6 photos each. Upgrade ' +
                  'any time for unlimited.'
                : 'Minnekart is invite-only for now. Open your invite link ' +
                  'to create an account.'}
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
          {turnstileSiteKey && canSignup && (
            <div className={styles.turnstile}>
              <Turnstile
                siteKey={turnstileSiteKey}
                onToken={setCaptchaToken}
                resetNonce={captchaNonce}
              />
            </div>
          )}
          <ErrorLine error={error} />
          <button
            className="button"
            type="submit"
            disabled={busy || !canSignup}
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form className={`fade ${styles.body}`} onSubmit={onForgot}>
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
        <div className={`fade ${styles.body} ${styles.center}`}>
          <Heading title="Check your inbox" subtitle="" />
          <p className={styles.message}>
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
      className={styles.tab}
      data-active={active}
      onClick={onClick}
    >
      {active && <span className={styles.diamond} aria-hidden="true" />}
      {label}
    </button>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className={`serif ${styles.title}`}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
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
  const id = useId();
  return (
    <div className={styles.fieldWrap}>
      <div className={styles.fieldHead}>
        <label className="label" htmlFor={id}>
          {label}
        </label>
      </div>
      <input
        id={id}
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
  return <div className={`fieldError ${styles.error}`}>{error}</div>;
}

function BackToSignIn({ onClick }: { onClick: () => void }) {
  return (
    <p className={styles.back}>
      <button type="button" className="authlink" onClick={onClick}>
        Back to sign in
      </button>
    </p>
  );
}
