import Wordmark from '@/components/brand/Wordmark';

import styles from './Nav.module.css';
import SignOutButton from './SignOutButton';

interface TopNavProps {
  name: string;
}

export default function TopNav({ name }: TopNavProps) {
  return (
    <header className={styles.topNav}>
      <Wordmark />
      <div className={styles.topNavRight}>
        <span className={styles.greeting}>Hi, {firstName(name)}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
