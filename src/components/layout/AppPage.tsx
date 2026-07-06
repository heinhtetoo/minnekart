import { ReactNode } from 'react';

import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';

import styles from './AppPage.module.css';

interface AppPageProps {
  user: { name: string; email: string; isOwner?: boolean };
  width?: 'narrow' | 'wide';
  children: ReactNode;
}

export default function AppPage({
  user,
  width = 'wide',
  children,
}: AppPageProps) {
  return (
    <>
      <TopNav name={user.name} email={user.email} isOwner={user.isOwner} />
      <main className={`fade ${styles.main}`}>
        <div
          className={width === 'narrow' ? styles.narrow : styles.wide}
        >
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
