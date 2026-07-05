import styles from './Toggle.module.css';

interface ToggleProps {
  on: boolean;
  busy?: boolean;
  onClick: () => void;
  label: string;
}

export default function Toggle({ on, busy, onClick, label }: ToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      data-on={on}
      onClick={onClick}
      disabled={busy}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className={styles.knob} />
    </button>
  );
}
