import { feature, mesh } from 'topojson-client';

import worldData from '@/data/world-110m.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
const topology = worldData as any;

export const land = feature(topology, topology.objects.countries) as any;

export const borders = mesh(
  topology,
  topology.objects.countries,
  (a: any, b: any) => a !== b,
);
/* eslint-enable @typescript-eslint/no-explicit-any */

// Pale continents on a dark sea: inverting the value is what makes the
// continents read. Every value is a theme token (globals.css), so the globe
// follows Haze / Nightfall. They are CSS values, so apply them with style —
// SVG presentation attributes do not resolve var().
export const GLOBE_COLORS = {
  water: 'var(--globe-ocean)',
  land: 'var(--globe-land)',
  border: 'var(--globe-border)',
  graticule: 'var(--globe-land)',
  // Pin rim only, in both globes. Task 24 owns it.
  stroke: 'var(--globe-pin-ring)',
};

// Both globes wash the limb the same way, so the stops live here rather than
// being duplicated in each component and drifting apart.
export const GLOBE_VIGNETTE = {
  inner: 'rgba(0,0,0,0)',
  outer: 'rgba(0,0,0,.28)',
};
