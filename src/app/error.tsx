'use client';

import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';
import form from '@/components/ui/Form.module.css';

import styles from './status.module.css';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ reset }: ErrorProps) {
  return (
    <main className={`fade ${styles.wrap}`}>
      <Wordmark />
      <div className={styles.ornament} aria-hidden="true">
        <span />
      </div>
      <div className={styles.message}>
        <h1 className={`serif ${styles.title}`}>Something came loose</h1>
        <p className={styles.body}>
          An unexpected error stopped this page from loading. Try again, or head
          back to the globe.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${form.button} ${styles.button}`}
            onClick={reset}
          >
            Try again
          </button>
          <Link href="/" className={styles.homeLink}>
            Back to the globe
          </Link>
        </div>
      </div>
    </main>
  );
}
