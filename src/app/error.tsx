'use client';

import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import styles from './status.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ reset }: ErrorProps) {
  return (
    <main className={`fade ${styles.wrap}`}>
      <Wordmark />
      <h1 className={`serif ${styles.title}`}>Something came loose</h1>
      <p className={styles.body}>
        An unexpected error stopped this page from loading. Try again, or head
        back to the globe.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className="button"
          onClick={reset}
          style={{ width: 'auto', padding: '13px 28px' }}
        >
          Try again
        </button>
        <Link href="/" className={styles.homeLink}>
          Back to the globe
        </Link>
      </div>
    </main>
  );
}
