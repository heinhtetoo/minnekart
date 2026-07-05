'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './Nav.module.css';

const ITEMS = [
  { href: '/', label: 'Globe' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/gallery', label: 'Gallery' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/' || pathname.startsWith('/trip/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks({ variant }: { variant: 'top' | 'bottom' }) {
  const pathname = usePathname();

  if (variant === 'top') {
    return (
      <nav className={styles.topLinks} aria-label="Primary">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.topLink}
            data-active={isActive(pathname, item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.bottomItem}
          data-active={isActive(pathname, item.href)}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/trip/new"
        className={styles.bottomItem}
        data-add="true"
        data-active={pathname === '/trip/new'}
      >
        Add
      </Link>
    </nav>
  );
}
