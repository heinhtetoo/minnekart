export interface Dimensions {
  width: number;
  height: number;
}

export function scaledDimensions(
  width: number,
  height: number,
  max: number,
): Dimensions {
  const longestSide = Math.max(width, height);
  if (longestSide <= max) {
    return { width, height };
  }
  const ratio = max / longestSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
