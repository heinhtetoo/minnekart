import { ReactElement } from 'react';

export type NavIconName = 'globe' | 'timeline' | 'gallery' | 'about' | 'plus';

const shared = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const paths: Record<NavIconName, ReactElement> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" {...shared} />
      <ellipse cx="12" cy="12" rx="4" ry="9" {...shared} />
      <line x1="3" y1="12" x2="21" y2="12" {...shared} />
    </>
  ),
  timeline: (
    <>
      <line x1="6" y1="4" x2="6" y2="20" {...shared} />
      <circle cx="6" cy="8" r="2" {...shared} />
      <circle cx="6" cy="16" r="2" {...shared} />
      <line x1="10" y1="8" x2="19" y2="8" {...shared} />
      <line x1="10" y1="16" x2="19" y2="16" {...shared} />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" {...shared} />
      <circle cx="8.5" cy="9" r="1.6" {...shared} />
      <path d="M4 18l5-5 4 4 3-3 4 4" {...shared} />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="8" r="3.4" {...shared} />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" {...shared} />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" {...shared} />
      <line x1="5" y1="12" x2="19" y2="12" {...shared} />
    </>
  ),
};

export default function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {paths[name]}
    </svg>
  );
}
