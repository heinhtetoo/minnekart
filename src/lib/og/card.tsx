import { ImageResponse } from 'next/og';
import { ReactElement } from 'react';

import { coverGradient } from '@/lib/photos/gradient';

import { ogFonts } from './fonts';

const PARCHMENT = '#f4efe6';
const INK = '#1c1917';
const FOREST = '#2c4e46';
const ACCENT = '#a55931';
const MUTED = '#756c5f';

export const OG_SIZE = { width: 1200, height: 630 };

export async function renderOgCard(card: ReactElement): Promise<ImageResponse> {
  return new ImageResponse(card, { ...OG_SIZE, fonts: await ogFonts() });
}

function wordmark(fontSize: number): ReactElement {
  const glyph = fontSize * 1.2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={glyph} height={glyph} viewBox="0 0 22 22" fill="none">
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
      <div style={{ display: 'flex', fontSize, fontWeight: 500 }}>
        <span style={{ color: FOREST }}>Minne</span>
        <span style={{ color: ACCENT }}>kart</span>
      </div>
    </div>
  );
}

interface TripCardProps {
  placeName: string;
  country: string;
  dates: string;
  photoDataUri: string | null;
  gradientSeed: string;
}

export function tripCard({
  placeName,
  country,
  dates,
  photoDataUri,
  gradientSeed,
}: TripCardProps): ReactElement {
  const frame = {
    width: 440,
    height: 502,
    borderRadius: 28,
    boxShadow: '0 24px 60px rgba(28, 25, 23, 0.28)',
  };
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: PARCHMENT,
        padding: 64,
        gap: 64,
        fontFamily: 'DM Sans',
      }}
    >
      {photoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoDataUri}
          alt=""
          style={{ ...frame, objectFit: 'cover' }}
        />
      ) : (
        <div style={{ ...frame, background: coverGradient(gradientSeed) }} />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          paddingTop: 36,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: 7,
            textTransform: 'uppercase',
            color: ACCENT,
          }}
        >
          {country}
        </div>
        <div
          style={{
            fontFamily: 'Playfair Display',
            fontSize: 78,
            fontWeight: 700,
            color: INK,
            lineHeight: 1.05,
            letterSpacing: -2,
            marginTop: 22,
          }}
        >
          {placeName}
        </div>
        <div style={{ fontSize: 30, color: MUTED, marginTop: 24 }}>{dates}</div>
        <div style={{ display: 'flex', flex: 1 }} />
        {wordmark(30)}
      </div>
    </div>
  );
}

interface GlobeCardProps {
  ownerName: string;
  countries: number;
  places: number;
  years: number;
}

function stat(value: number, label: string): ReactElement {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div
        style={{
          fontFamily: 'Playfair Display',
          fontSize: 68,
          fontWeight: 700,
          color: FOREST,
        }}
      >
        {/* satori can't take numeric children */}
        {String(value)}
      </div>
      <div
        style={{
          fontSize: 21,
          fontWeight: 500,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: MUTED,
          marginTop: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface BrandCardProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
}

export function brandCard({
  eyebrow,
  title,
  subtitle,
}: BrandCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: PARCHMENT,
        fontFamily: 'DM Sans',
        padding: '0 96px',
        gap: 28,
      }}
    >
      {wordmark(30)}
      {eyebrow ? (
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: ACCENT,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: 'Playfair Display',
          fontSize: 76,
          fontWeight: 700,
          color: INK,
          lineHeight: 1.05,
          letterSpacing: -2,
          maxWidth: 900,
        }}
      >
        {title}
      </div>
      <div
        style={{ fontSize: 32, color: MUTED, lineHeight: 1.4, maxWidth: 820 }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export function globeCard({
  ownerName,
  countries,
  places,
  years,
}: GlobeCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: PARCHMENT,
        fontFamily: 'DM Sans',
        gap: 40,
      }}
    >
      {wordmark(28)}
      <div
        style={{
          fontFamily: 'Playfair Display',
          fontSize: 84,
          fontWeight: 700,
          color: INK,
          letterSpacing: -2,
        }}
      >
        {`${ownerName}’s globe`}
      </div>
      <div style={{ display: 'flex', gap: 84, marginTop: 8 }}>
        {stat(countries, 'Countries')}
        {stat(places, 'Places')}
        {stat(years, 'Years')}
      </div>
    </div>
  );
}
