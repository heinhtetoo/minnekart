import { ReactElement } from 'react';

export type NavIconName =
  'globe' | 'timeline' | 'gallery' | 'profile' | 'plus' | 'photo';

// One set, one stroke: 24-unit grid, round caps, drawn to sit with the Rune M.
const paths: Record<NavIconName, ReactElement> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5z" />
    </>
  ),
  timeline: (
    <>
      <path d="M6 4v16" />
      <circle cx="6" cy="7" r="1.6" fill="currentColor" />
      <circle cx="6" cy="17" r="1.6" fill="currentColor" />
      <path d="M10.5 7H20M10.5 12h6.5M10.5 17H20" />
    </>
  ),
  gallery: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17.5l4.6-4.4 3.6 3.4 2.6-2.4 5.2 4.8" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 20c.9-3.5 3.6-5.4 7-5.4s6.1 1.9 7 5.4" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  photo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="10.5" r="1.7" />
      <path d="M4 17l5-4.5 4 3.5 2.5-2 4.5 3.8" />
    </>
  ),
};

export default function NavIcon({
  name,
  size = 22,
  strokeWidth = 1.7,
}: {
  name: NavIconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none' }}
    >
      {paths[name]}
    </svg>
  );
}
