/** Discard late responses after refresh, account changes or unmount. */
export function requestSequence() {
  let current = 0;
  return { begin: () => ++current, isCurrent: (id: number) => id === current, invalidate: () => { current++; } };
}