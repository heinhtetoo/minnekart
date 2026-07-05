export type Rotation = [number, number, number];

// True when a lng/lat point is on the near-facing hemisphere of an
// orthographic globe with the given rotation (back-face culling).
export function isPinVisible(
  lng: number,
  lat: number,
  rotation: Rotation,
): boolean {
  const toRad = Math.PI / 180;
  const centreLat = -rotation[1] * toRad;
  const deltaLng = (lng + rotation[0]) * toRad;
  const latRad = lat * toRad;
  return (
    Math.sin(centreLat) * Math.sin(latRad) +
      Math.cos(centreLat) * Math.cos(latRad) * Math.cos(deltaLng) >
    0
  );
}
