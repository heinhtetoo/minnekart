import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import styles from './PublicChrome.module.css';

interface PublicChromeProps {
  ownerName?: string;
  viewerLoggedIn: boolean;
}

export default function PublicChrome({
  ownerName,
  viewerLoggedIn,
}: PublicChromeProps) {
  return (
    <header className={styles.header}>
      <Link href="/" aria-label="Minnekart home" className={styles.brand}>
        <Wordmark />
      </Link>
      {ownerName && (
        <p className={styles.attribution}>{ownerName}&apos;s memories</p>
      )}
      <div className={styles.actions}>
        {viewerLoggedIn ? (
          <Link href="/" className={styles.signUp}>
            My globe →
          </Link>
        ) : (
          <>
            <Link href="/" className={styles.signIn}>
              Sign in
            </Link>
            <Link href="/" className={styles.signUp}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
