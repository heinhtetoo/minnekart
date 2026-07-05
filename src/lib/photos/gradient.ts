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

export function coverGradient(seed: string, index = 0): string {
  const pair = GRAD_PAIRS[hashSeed(seed) % GRAD_PAIRS.length];
  const angle = ANGLES[index % ANGLES.length];
  return `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]})`;
}
