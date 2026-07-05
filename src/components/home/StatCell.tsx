import styles from './Home.module.css';

interface StatCellProps {
  value: string;
  label: string;
  bordered?: boolean;
}

export default function StatCell({ value, label, bordered }: StatCellProps) {
  return (
    <div
      className={styles.statCell}
      style={{
        textAlign: 'center',
        borderLeft: bordered ? '1px solid rgba(255,255,255,.12)' : undefined,
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 'clamp(34px,5vw,48px)',
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2.5,
          textTransform: 'uppercase',
          color: '#9ec2b2',
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}
