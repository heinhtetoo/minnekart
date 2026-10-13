import Link from 'next/link';
import { Ref, useId } from 'react';

import Wordmark from '@/components/brand/Wordmark';

import styles from './PeekPanel.module.css';

interface PeekPanelProps {
  ref?: Ref<HTMLDivElement>;
  title: string;
  country: string;
  dates: string;
  year: string;
  highlight: string | null;
  story: string | null;
  href?: string;
  showSignupHook?: boolean;
  onClose: () => void;
}

// The chosen place as the back of a postcard: the message on the left, the
// stamp, postmark and address on the right. The stamp and postmark are
// decoration; the same facts are on the card as text. It takes focus when it
// opens (PublicGlobe), so it is a named group that can hold focus.
export default function PeekPanel({
  ref,
  title,
  country,
  dates,
  year,
  highlight,
  story,
  href,
  showSignupHook,
  onClose,
}: PeekPanelProps) {
  const hasMessage = Boolean(highlight || story);
  const nameId = useId();

  return (
    <div
      ref={ref}
      className={`fade ${styles.card}`}
      role="group"
      aria-labelledby={nameId}
      tabIndex={-1}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={styles.close}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>

      <div className={styles.body} data-message={hasMessage}>
        {hasMessage && (
          <>
            <div className={styles.message}>
              {highlight && (
                <p className={`serif ${styles.quote}`}>“{highlight}”</p>
              )}
              {story && <p className={styles.story}>{story}</p>}
            </div>
            <span className={styles.rule} aria-hidden="true" />
          </>
        )}
        <div className={styles.address}>
          <Stamp country={country} year={year} />
          <div id={nameId} className={`serif ${styles.name}`}>
            {title}
          </div>
          <span className={styles.line}>{country}</span>
          <span className={styles.line}>{dates}</span>
        </div>
      </div>

      {(href || showSignupHook) && (
        <div className={styles.footer}>
          {href && (
            <Link href={href} className={styles.view}>
              View memory →
            </Link>
          )}
          {showSignupHook && (
            <Link href="/?signup=1" className={styles.hook}>
              Sign up to save places like this →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// A perforated stamp with the Minnekart mark, and a circular date stamp: the
// country round the ring, the year in the middle, and wavy cancel lines that
// run on across the stamp in pale ink.
function Stamp({ country, year }: { country: string; year: string }) {
  const ringId = useId();
  const ring = country.toUpperCase();
  // The ring holds about a dozen letters; longer names are squeezed to fit.
  const fit =
    ring.length > 12
      ? { textLength: 84, lengthAdjust: 'spacingAndGlyphs' }
      : {};
  const wave = (x: number, y: number, segments: number) =>
    `M${x} ${y} q6 -4 12 0${' t12 0'.repeat(segments - 1)}`;

  return (
    <span className={styles.post} aria-hidden="true">
      <span className={styles.stamp}>
        <span className={styles.stampFace}>
          <Wordmark symbolOnly size={40} ink="#f3e9e2" spot="#d0662f" />
        </span>
      </span>
      <svg className={styles.postmark} viewBox="0 0 132 84">
        <circle cx="38" cy="42" r="34" strokeWidth="1.4" />
        <circle cx="38" cy="42" r="21" strokeWidth="1" />
        <defs>
          <path id={ringId} d="M10.5 42a27.5 27.5 0 1 1 55 0" />
        </defs>
        <text className={styles.ringText} {...fit}>
          <textPath href={`#${ringId}`} startOffset="50%" textAnchor="middle">
            {ring}
          </textPath>
        </text>
        <text className={styles.year} x="38" y="46.5" textAnchor="middle">
          {year}
        </text>
        {[0, 1, 2].map((i) => (
          <path
            key={`ink${i}`}
            d={wave(74, 32 + i * 10, 2)}
            strokeWidth="1.2"
          />
        ))}
        {[0, 1, 2].map((i) => (
          <path
            key={`pale${i}`}
            className={styles.onStamp}
            d={wave(98, 32 + i * 10, 2)}
            strokeWidth="1.2"
          />
        ))}
      </svg>
    </span>
  );
}
