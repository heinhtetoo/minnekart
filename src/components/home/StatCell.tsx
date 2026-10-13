import styles from './LoggedOutHome.module.css';

interface StatCellProps {
  value: string;
  label: string;
}

export default function StatCell({ value, label }: StatCellProps) {
  return (
    <div className={styles.statCell}>
      <span className={`serif ${styles.statValue}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
