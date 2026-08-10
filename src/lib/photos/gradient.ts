const GRAD_PAIRS: [string, string][] = [
  ['#d8b48c', '#a86f3c'],
  ['#c98b6a', '#8a3f3a'],
  ['#e0b878', '#c07a3a'],
  ['#5a7a9a', '#2e4a6a'],
  ['#c86a4a', '#8a3020'],
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
