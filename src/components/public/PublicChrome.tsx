import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import styles from './PublicChrome.module.css';

interface PublicChromeProps {
  ownerName: string;
}

export default function PublicChrome({ ownerName }: PublicChromeProps) {
  return (
    <header className={styles.header}>
      <Link href="/" aria-label="Minnekart home" className={styles.brand}>
        <Wordmark />
      </Link>
      <p className={styles.attribution}>{ownerName}&apos;s memories</p>
      <Link href="/" className={styles.signIn}>
        Sign in
      </Link>
    </header>
  );
}
