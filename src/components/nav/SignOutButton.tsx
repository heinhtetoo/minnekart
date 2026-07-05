'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authApi } from '@/components/auth/api';

import styles from './Nav.module.css';

interface SignOutButtonProps {
  className?: string;
}

export default function SignOutButton({ className }: SignOutButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await authApi.logout();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={className ? `${styles.signOut} ${className}` : styles.signOut}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
