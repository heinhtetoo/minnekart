import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';
import { navItems } from '@/components/nav/navItems';

import styles from './Footer.module.css';

interface FooterProps {
  loggedIn: boolean;
}

export default function Footer({ loggedIn }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link href="/" aria-label="Minnekart home" className={styles.brand}>
          <Wordmark base="#f4efe6" accent="#9ec2b2" stroke="#9ec2b2" />
        </Link>

        <nav className={styles.links} aria-label="Footer">
          {loggedIn ? (
            navItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))
          ) : (
            <>
              <Link href="/about" className={styles.link}>
                About
              </Link>
              <Link href="/" className={styles.link}>
                Sign in
              </Link>
            </>
          )}
        </nav>

        <p className={styles.copy}>© {year} · A memory palace you can spin</p>
      </div>
    </footer>
  );
}
