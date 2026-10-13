import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import styles from './status.module.css';

export default function NotFound() {
  return (
    <main className={`fade ${styles.wrap}`}>
      <Wordmark />
      <div className={styles.ornament} aria-hidden="true">
        <span />
      </div>
      <div className={styles.message}>
        <h1 className={`serif ${styles.title}`}>Nothing pinned here</h1>
        <p className={styles.body}>
          The page you&apos;re looking for has wandered off the map.
        </p>
        <div className={styles.actions}>
          <Link href="/" className="button">
            Back to the globe
          </Link>
        </div>
      </div>
    </main>
  );
}
