import Link from 'next/link';

import styles from './PeekPanel.module.css';

interface PeekPanelProps {
  title: string;
  subtitle: string;
  highlight: string | null;
  story: string | null;
  href?: string;
  showSignupHook?: boolean;
  onClose: () => void;
}

export default function PeekPanel({
  title,
  subtitle,
  highlight,
  story,
  href,
  showSignupHook,
  onClose,
}: PeekPanelProps) {
  return (
    <div
      className={`fade ${styles.peek}`}
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '18px 20px',
        border: '1px solid rgba(28,25,23,.07)',
        boxShadow: '0 8px 24px rgba(28,25,23,.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div
            className="serif"
            style={{ fontSize: 19, fontWeight: 600, color: 'var(--forest)' }}
          >
            {title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {highlight && (
        <p
          className="serif"
          style={{
            fontSize: 15,
            color: 'var(--foreground)',
            margin: '12px 0 0',
            lineHeight: 1.6,
            fontStyle: 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          “{highlight}”
        </p>
      )}
      {story && (
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--muted)',
            margin: '10px 0 0',
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {story}
        </p>
      )}
      {href && (
        <Link
          href={href}
          className="authlink"
          style={{ display: 'inline-block', fontSize: 13, marginTop: 14 }}
        >
          View memory →
        </Link>
      )}
      {showSignupHook && (
        <Link
          href="/"
          style={{
            display: 'block',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--accent)',
            marginTop: 10,
          }}
        >
          Sign up to save places like this →
        </Link>
      )}
    </div>
  );
}
