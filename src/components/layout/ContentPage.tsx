import { ReactNode } from 'react';

import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import PublicChrome from '@/components/public/PublicChrome';
import { isVerified } from '@/lib/auth/current-user';
import { SessionUser } from '@/lib/auth/session';

import styles from './ContentPage.module.css';

interface ContentPageProps {
  viewer: SessionUser | null;
  eyebrow: string;
  title: string;
  updated?: string;
  layout?: 'prose' | 'wide';
  children: ReactNode;
}

export default function ContentPage({
  viewer,
  eyebrow,
  title,
  updated,
  layout = 'prose',
  children,
}: ContentPageProps) {
  const loggedIn = viewer !== null && isVerified(viewer);

  return (
    <>
      {loggedIn ? (
        <TopNav
          name={viewer.name}
          email={viewer.email}
          isOwner={viewer.role === 'owner'}
        />
      ) : (
        <PublicChrome viewerLoggedIn={false} />
      )}
      <main className="fade">
        <div
          className={`${styles.page}${
            layout === 'wide' ? ` ${styles.pageWide}` : ''
          }`}
        >
          <header className={styles.header}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={`serif ${styles.title}`}>{title}</h1>
            {updated && (
              <p className={styles.updated}>Last updated {updated}</p>
            )}
          </header>
          <div className={layout === 'prose' ? styles.prose : styles.wide}>
            {children}
          </div>
        </div>
      </main>
      <div
        className={`${styles.footerHolder}${
          loggedIn ? ` ${styles.footerHolderApp}` : ''
        }`}
      >
        <Footer loggedIn={loggedIn} />
      </div>
      {loggedIn && <BottomNav />}
    </>
  );
}
