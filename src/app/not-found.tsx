import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import styles from './status.module.css';

export default function NotFound() {
  return (
    <main className={`fade ${styles.wrap}`}>
      <Wordmark />
      <h1 className={`serif ${styles.title}`}>Nothing pinned here</h1>
      <p className={styles.body}>
        The page you&apos;re looking for has wandered off the map.
      </p>
      <div className={styles.actions}>
        <Link
          href="/"
          className="button"
          style={{ width: 'auto', padding: '13px 28px' }}
        >
          Back to the globe
        </Link>
      </div>
    </main>
  );
}
