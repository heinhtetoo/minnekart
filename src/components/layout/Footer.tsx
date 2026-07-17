import Link from 'next/link';

import Wordmark from '@/components/brand/Wordmark';
import { navItems } from '@/components/nav/navItems';

import styles from './Footer.module.css';

interface FooterProps {
  loggedIn: boolean;
}

const productItems = [
  { href: '/about', label: 'About' },
  { href: '/guides', label: 'Guides' },
  { href: '/pricing', label: 'Pricing' },
];

const legalItems = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
];

export default function Footer({ loggedIn }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" aria-label="Minnekart home" className={styles.mark}>
            <Wordmark base="#f4efe6" accent="#9ec2b2" stroke="#9ec2b2" />
          </Link>
          <p className={styles.copy}>© {year} · A memory palace you can spin</p>
        </div>

        <div className={styles.columns}>
          {loggedIn && (
            <nav
              className={`${styles.column} ${styles.explore}`}
              aria-label="Explore"
            >
              <p className={styles.heading}>Explore</p>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
          <nav className={styles.column} aria-label="Product">
            <p className={styles.heading}>Product</p>
            {productItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))}
          </nav>
          <nav className={styles.column} aria-label="Legal">
            <p className={styles.heading}>Legal</p>
            {legalItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.link}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
