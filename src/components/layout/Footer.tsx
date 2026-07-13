import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';
import { navItems } from '@/components/nav/navItems';

import styles from './Footer.module.css';

interface FooterProps {
  loggedIn: boolean;
}

const legalItems = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
];

export default function Footer({ loggedIn }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link href="/" aria-label="Minnekart home" className={styles.brand}>
          <Wordmark base="#f4efe6" accent="#9ec2b2" stroke="#9ec2b2" />
        </Link>

        {loggedIn && (
          <nav className={styles.links} aria-label="Footer">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <nav className={styles.legal} aria-label="Legal">
          {legalItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
        </nav>

        <p className={styles.copy}>© {year} · A memory palace you can spin</p>
      </div>
    </footer>
  );
}
