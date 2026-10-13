import { ImageResponse } from 'next/og';

// Rune M app tile: the small-size cut, linen on plum, ember spot.
const PLUM = '#3e2442';
const LINEN = '#f3e9e2';
const EMBER = '#e0773f';

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
        background: PLUM,
        borderRadius: 14,
      }}
    >
      <svg width={38} height={41} viewBox="0 0 176 192">
        <path
          fill={LINEN}
          d="M142.8 0.8L142.8 191.2L175.2 191.2L175.2 0.8ZM130.2 1.93L89.13 43L113.46 67.32L130.2 50.58ZM130.2 86.33L113.46 69.59L89.13 93.91L130.2 134.98ZM45.8 134.98L86.87 93.91L62.54 69.59L45.8 86.33ZM62.54 67.32L86.87 43L45.8 1.93L45.8 50.58ZM0.8 0.8L0.8 191.2L33.2 191.2L33.2 0.8Z"
        />
        <path fill={EMBER} d="M88 44.13L63.68 68.46L88 92.78L112.32 68.46Z" />
      </svg>
    </div>,
    size,
  );
}
