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

export const GLOBE_COLORS = {
  water: '#9ecdb6',
  land: '#e4dcd0',
  border: '#66a07e',
  graticule: '#86b89a',
  stroke: '#fff',
};
