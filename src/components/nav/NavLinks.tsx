'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './Nav.module.css';
import NavIcon from './navIcons';
import { NavItem, navItems } from './navItems';

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
        {navItems.map((item) => (
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

  const middle = Math.ceil(navItems.length / 2);
  const leftItems = navItems.slice(0, middle);
  const rightItems = navItems.slice(middle);

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {leftItems.map((item) => (
        <BottomLink key={item.href} item={item} pathname={pathname} />
      ))}
      <Link
        href="/trip/new"
        className={styles.addFab}
        aria-label="Add a memory"
        data-active={pathname === '/trip/new'}
      >
        <span className={styles.addFabCircle}>
          <NavIcon name="plus" />
        </span>
        <span className={styles.addFabLabel}>Add</span>
      </Link>
      {rightItems.map((item) => (
        <BottomLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

function BottomLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      href={item.href}
      className={styles.bottomItem}
      data-active={isActive(pathname, item.href)}
    >
      <NavIcon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}
