'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { authApi } from '@/components/auth/api';

import styles from './Nav.module.css';

interface AccountMenuProps {
  name: string;
  email: string;
}

export default function AccountMenu({ name, email }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function signOut() {
    setBusy(true);
    await authApi.logout();
    router.refresh();
  }

  const initial = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={styles.account} ref={ref}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className={`fade ${styles.menu}`}>
          <div className={styles.menuHead}>
            <div className={styles.menuName}>{name}</div>
            <div className={styles.menuEmail}>{email}</div>
          </div>
          <button
            type="button"
            className={styles.menuSignOut}
            onClick={signOut}
            disabled={busy}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
