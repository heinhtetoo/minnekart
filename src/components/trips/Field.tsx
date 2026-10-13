import form from '@/components/ui/Form.module.css';

import styles from './TripForm.module.css';

export default function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldHead}>
        <span className={form.label} style={{ margin: 0 }}>
          {label}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
