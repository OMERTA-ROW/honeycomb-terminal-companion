import { describe, expect, it } from 'vitest';
import { requestSequence } from './request-sequence';

describe('private refresh sequencing', () => {
  it('rejects an older refresh after a newer refresh starts', () => {
    const s = requestSequence(), old = s.begin(), next = s.begin();
    expect(s.isCurrent(old)).toBe(false);
    expect(s.isCurrent(next)).toBe(true);
  });
  it('rejects responses after account change or unmount', () => {
    const s = requestSequence(), old = s.begin();
    s.invalidate();
    expect(s.isCurrent(old)).toBe(false);
  });
});