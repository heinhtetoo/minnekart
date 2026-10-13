// Dusk only: plum, persimmon, apricot and linen, so a photo-less memory
// never introduces a colour the palette doesn't have.
const GRAD_PAIRS: [string, string][] = [
  ['#e8a07a', '#a0512c'],
  ['#b79ab8', '#5a3a5f'],
  ['#e7c29a', '#c0703f'],
  ['#8f6f93', '#3e2442'],
  ['#d98a6a', '#7a3a45'],
];

const ANGLES = [135, 118, 152, 105, 142, 125];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// The two stops on their own, for callers that cannot use a CSS string —
// SVG wants <linearGradient> stops, not `linear-gradient(...)`.
export function coverGradientPair(seed: string): [string, string] {
  return GRAD_PAIRS[hashSeed(seed) % GRAD_PAIRS.length];
}

export function coverGradient(seed: string, index = 0): string {
  const [from, to] = coverGradientPair(seed);
  const angle = ANGLES[index % ANGLES.length];
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
