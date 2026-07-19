import { ImageResponse } from 'next/og';

const FOREST = '#2c4e46';
const PARCHMENT = '#f4efe6';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: PARCHMENT,
        borderRadius: '50%',
      }}
    >
      <svg width={44} height={44} viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9.5" stroke={FOREST} strokeWidth="1.6" />
        <ellipse
          cx="11"
          cy="11"
          rx="4.5"
          ry="9.5"
          stroke={FOREST}
          strokeWidth="1.6"
        />
        <line
          x1="1.5"
          y1="11"
          x2="20.5"
          y2="11"
          stroke={FOREST}
          strokeWidth="1.6"
        />
      </svg>
    </div>,
    size,
  );
}
