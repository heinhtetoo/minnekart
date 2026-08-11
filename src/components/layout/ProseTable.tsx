import { ReactNode } from 'react';

import styles from './ContentPage.module.css';

interface ProseTableProps {
  children: ReactNode;
  // Competitor facts age. A dated note says when a claim was last checked,
  // where an undated one quietly rots.
  note?: string;
}

// Wraps a table in its own horizontal scroll container. The cell styling comes
// from `.prose table` in ContentPage.module.css, which applies by descendancy.
export default function ProseTable({ children, note }: ProseTableProps) {
  return (
    <>
      <div className={styles.tableWrap}>{children}</div>
      {note && <p className={styles.tableNote}>{note}</p>}
    </>
  );
}
