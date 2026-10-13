import Link from 'next/link';
import { ReactNode } from 'react';

import styles from './ContentPage.module.css';

interface ProseCtaProps {
  href: string;
  children: ReactNode;
}

// A content page's closing call to action: an ordinary link, set as a pill
// button by `.cta` in ContentPage.module.css.
export default function ProseCta({ href, children }: ProseCtaProps) {
  return (
    <p className={styles.cta}>
      <Link href={href}>{children}</Link>
    </p>
  );
}
