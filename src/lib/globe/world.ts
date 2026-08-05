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

// Pale continents on a dark sea. The old palette put land and water at almost
// the same lightness, so the continents never quite resolved; inverting the
// value is what makes them read. The sea is --forest, already the stats band
// and the footer, so the globe costs the product no new colour.
export const GLOBE_COLORS = {
  water: '#2c4e46',
  land: '#e4dcd0',
  border: '#1c3a33',
  graticule: '#e4dcd0',
  // Pin rim only, in both globes. Task 24 owns it.
  stroke: '#fff',
};

// Both globes wash the limb the same way, so the stops live here rather than
// being duplicated in each component and drifting apart.
export const GLOBE_VIGNETTE = {
  inner: 'rgba(0,0,0,0)',
  outer: 'rgba(0,0,0,.28)',
};
