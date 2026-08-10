export interface SpinConditions {
  autoSpin: boolean;
  // False on pages whose controls a user taps straight away — the idle spin's
  // redraw delays tap dispatch on iOS.
  spinOnTouch: boolean;
  coarsePointer: boolean;
  reduceMotion: boolean;
}

// Whether the globe may turn on its own. Drag-to-spin is never gated by this:
// reduced motion means "do not move things at me unprompted", and a drag is
// motion the user asked for.
export function shouldAutoSpin({
  autoSpin,
  spinOnTouch,
  coarsePointer,
  reduceMotion,
}: SpinConditions): boolean {
  if (!autoSpin || reduceMotion) return false;
  return spinOnTouch || !coarsePointer;
}
