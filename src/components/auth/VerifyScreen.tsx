'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Wordmark from '@/components/brand/Wordmark';

import { authApi } from './api';
import styles from './auth.module.css';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

// The API answers a wrong code with `invalid` (OtpResult in lib/auth/otp.ts);
// `invalid_code` is kept for any older reply.
const VERIFY_ERRORS: Record<string, string> = {
  invalid: 'That code is incorrect. Check it and try again.',
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
  const [digits, setDigits] = useState<string[]>(() =>
    Array(CODE_LENGTH).fill(''),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const refocusRef = useRef(false);

  function focusCell(index: number) {
    inputsRef.current[index]?.focus();
  }

  // After a failed check, focus the first box once the boxes are enabled
  // again: they are still disabled in the same tick the error arrives, and a
  // disabled input cannot take focus.
  useEffect(() => {
    if (!busy && refocusRef.current) {
      refocusRef.current = false;
      focusCell(0);
    }
  }, [busy]);

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
    refocusRef.current = true;
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
    <main className={`fade ${styles.verifyPage}`}>
      <Wordmark />
      <div className={`${styles.sheet} ${styles.standalone}`}>
        <div className={`${styles.body} ${styles.verify}`}>
          <h1 className={`serif ${styles.title}`}>Confirm your email</h1>
          <p className={styles.subtitle}>
            We sent a six-digit code to <b>{maskEmail(email)}</b>. Enter it to
            open your globe.
          </p>

          <div className={styles.otp}>
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

          <div className={`fieldError ${styles.error}`}>{error}</div>
          {notice && !error && (
            <p className={styles.notice}>
              <span className={styles.diamond} aria-hidden="true" />
              {notice}
            </p>
          )}

          <p className={styles.small}>
            Didn&apos;t get it?{' '}
            <button
              type="button"
              className="authlink"
              onClick={resend}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </p>
          <p className={styles.small}>
            Not you?{' '}
            <button type="button" className="authlink" onClick={signOut}>
              Sign out
            </button>
          </p>
        </div>
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
