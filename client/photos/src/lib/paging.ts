/**
 * Move `delta` steps from `current` within a list of `length`, wrapping around
 * at both ends (matching the portfolio's existing lightbox). Paging always
 * stays within the currently displayed set the caller passes its length for.
 */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((current + delta) % length) + length) % length;
}
