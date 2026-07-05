import styles from './Nav.module.css';
import SignOutButton from './SignOutButton';

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      <span className={styles.bottomNavItem}>
        <GlobeIcon />
        Your globe
      </span>
      <SignOutButton className={styles.bottomNavSignOut} />
    </nav>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9.5" stroke="currentColor" strokeWidth="1.6" />
      <ellipse
        cx="11"
        cy="11"
        rx="4.5"
        ry="9.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <line
        x1="1.5"
        y1="11"
        x2="20.5"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
