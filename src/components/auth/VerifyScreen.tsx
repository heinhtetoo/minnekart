'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import Wordmark from '@/components/brand/Wordmark';

import { authApi } from './api';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const VERIFY_ERRORS: Record<string, string> = {
  invalid_code: 'That code is incorrect. Check it and try again.',
  expired: 'That code has expired. Send a fresh one below.',
  not_found: 'That code has expired. Send a fresh one below.',
  too_many_attempts: 'Too many attempts. Please wait a moment.',
  invalid_request: 'Enter the six-digit code from your email.',
};

interface VerifyScreenProps {
  email: string;
}

export default function VerifyScreen({ email }: VerifyScreenProps) {
  const router = useRouter();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(
    () => Array(CODE_LENGTH).fill(''),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  function focusCell(index: number) {
    inputsRef.current[index]?.focus();
  }

  async function submit(code: string) {
    setBusy(true);
    setError('');
    const result = await authApi.verify(code);
    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(VERIFY_ERRORS[result.error ?? ''] ?? 'Could not verify the code.');
    setDigits(Array(CODE_LENGTH).fill(''));
    focusCell(0);
  }

  function setDigitAt(index: number, value: string) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) {
      focusCell(index + 1);
    }
    const code = next.join('');
    if (code.length === CODE_LENGTH && !next.includes('')) {
      submit(code);
    }
  }

  function onChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigitAt(index, digit);
  }

  function onKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      focusCell(index - 1);
    }
  }

  function onPaste(event: React.ClipboardEvent) {
    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setDigits(next);
    focusCell(Math.min(pasted.length, CODE_LENGTH - 1));
    if (pasted.length === CODE_LENGTH) {
      submit(pasted);
    }
  }

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    const timer = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1) {
          clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
  }

  async function resend() {
    setError('');
    setNotice('');
    const result = await authApi.resend();
    if (result.ok) {
      setNotice('A fresh code is on its way.');
      startCooldown();
      return;
    }
    if (result.error === 'rate_limited') {
      setError('Too many requests. Please wait a minute.');
      startCooldown();
      return;
    }
    setError('Could not resend the code.');
  }

  async function signOut() {
    await authApi.logout();
    router.refresh();
  }

  return (
    <main
      className="fade"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: 'min(100%, 440px)',
          background: '#fff',
          borderRadius: 18,
          padding: 'clamp(28px, 5vw, 40px)',
          border: '1px solid rgba(28,25,23,.07)',
          boxShadow: '0 12px 40px rgba(28,25,23,.10)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
          <Wordmark />
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--foreground)',
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
          }}
        >
          Confirm your email
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}
        >
          We sent a six-digit code to <b>{maskEmail(email)}</b>. Enter it to
          open your globe.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${CODE_LENGTH}, 1fr)`,
            gap: 8,
            marginBottom: 8,
          }}
        >
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              className="otpCell"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              disabled={busy}
              onChange={(event) => onChange(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event.key)}
              onPaste={onPaste}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <div className="fieldError" style={{ minHeight: 18 }}>
          {error}
        </div>
        {notice && !error && (
          <p style={{ fontSize: 12.5, color: 'var(--forest)', margin: '0 0 4px' }}>
            {notice}
          </p>
        )}

        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '14px 0 0' }}>
          Didn&apos;t get it?{' '}
          <button
            type="button"
            className="authlink"
            onClick={resend}
            disabled={cooldown > 0}
            style={cooldown > 0 ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '18px 0 0' }}>
          Not you?{' '}
          <button type="button" className="authlink" onClick={signOut}>
            Sign out
          </button>
        </p>
      </div>
    </main>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}
