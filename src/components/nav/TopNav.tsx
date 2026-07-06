import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';

import AccountMenu from './AccountMenu';
import styles from './Nav.module.css';
import NavLinks from './NavLinks';

interface TopNavProps {
  name: string;
  email: string;
  isOwner?: boolean;
}

export default function TopNav({ name, email, isOwner }: TopNavProps) {
  return (
    <nav className={styles.topNav}>
      <Link href="/" aria-label="Minnekart home" className={styles.brand}>
        <Wordmark />
      </Link>
      <NavLinks variant="top" />
      <div className={styles.topNavRight}>
        <Link href="/trip/new" className={styles.newMemory}>
          + New memory
        </Link>
        <AccountMenu name={name} email={email} isOwner={isOwner} />
      </div>
    </nav>
  );
}
