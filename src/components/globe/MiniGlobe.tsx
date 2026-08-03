'use client';

import { geoOrthographic, geoPath } from 'd3-geo';
import { useId, useMemo } from 'react';

import { Rotation } from '@/lib/globe/projection';
import { borders, GLOBE_COLORS, land } from '@/lib/globe/world';

// The angle the main globe opens at, so an unpinned mini globe looks like a
// small version of the one on the home page rather than a different planet.
const RESTING_ROTATION: Rotation = [0, -25, 0];

interface MiniGlobeProps {
  lat: number | null;
  lng: number | null;
  accent?: string;
  size?: number;
}

// Display only: no drag, no zoom, no click, and no effect. Rendering straight
// from the props is what keeps it in step with the form — every source that
// moves the pin already writes to the same coords state.
export default function MiniGlobe({
  lat,
  lng,
  accent = '#a55931',
  size = 112,
}: MiniGlobeProps) {
  // useId's own format is not safe inside url(#…), so strip it down to
  // characters a fragment reference can carry.
  const vignetteId = `mini-globe-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const pinned = lat !== null && lng !== null;

  const { landPaths, borderPath, radius } = useMemo(() => {
    const scale = size / 2 - 2;
    const rotation: Rotation = pinned
      ? [-(lng as number), -(lat as number), 0]
      : RESTING_ROTATION;
    const projection = geoOrthographic()
      .scale(scale)
      .translate([size / 2, size / 2])
      .rotate(rotation)
      .clipAngle(90);
    const path = geoPath(projection);
    return {
      landPaths: (land.features as unknown[]).map((item) =>
        path(item as never),
      ),
      borderPath: path(borders as never),
      radius: scale,
    };
  }, [lat, lng, pinned, size]);

  const centre = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <radialGradient id={vignetteId} cx="50%" cy="50%" r="50%">
          <stop offset="58%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,20,40,.14)" />
        </radialGradient>
      </defs>

      <circle
        cx={centre}
        cy={centre}
        r={radius}
        fill={GLOBE_COLORS.water}
        stroke={GLOBE_COLORS.border}
        strokeWidth={0.9}
      />
      <g
        fill={GLOBE_COLORS.land}
        stroke={GLOBE_COLORS.border}
        strokeWidth={0.4}
        strokeLinejoin="round"
      >
        {landPaths.map((d, index) => d && <path key={index} d={d} />)}
      </g>
      {borderPath && (
        <path
          d={borderPath}
          fill="none"
          stroke={GLOBE_COLORS.border}
          strokeWidth={0.3}
          opacity={0.55}
        />
      )}
      <circle cx={centre} cy={centre} r={radius} fill={`url(#${vignetteId})`} />

      {/* Rotating to [-lng, -lat] puts the pin at the centre by definition. */}
      {pinned && (
        <>
          <circle
            cx={centre}
            cy={centre}
            r={radius * 0.15}
            fill={accent}
            opacity={0.2}
          />
          <circle
            cx={centre}
            cy={centre}
            r={radius * 0.065}
            fill={accent}
            stroke={GLOBE_COLORS.stroke}
            strokeWidth={radius * 0.028}
          />
        </>
      )}
    </svg>
  );
}
