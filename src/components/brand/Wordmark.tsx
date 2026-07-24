interface WordmarkProps {
  size?: number;
  stroke?: string;
  base?: string;
  accent?: string;
}

export default function Wordmark({
  size = 24,
  stroke = '#2c4e46',
  base = '#2c4e46',
  accent = 'var(--accent, #a55931)',
}: WordmarkProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9.5" stroke={stroke} strokeWidth="1.6" />
        <ellipse
          cx="11"
          cy="11"
          rx="4.5"
          ry="9.5"
          stroke={stroke}
          strokeWidth="1.6"
        />
        <line
          x1="1.5"
          y1="11"
          x2="20.5"
          y2="11"
          stroke={stroke}
          strokeWidth="1.6"
        />
      </svg>
      <span
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: base,
          letterSpacing: '-0.2px',
        }}
      >
        Minne<span style={{ color: accent }}>kart</span>
      </span>
    </span>
  );
}
