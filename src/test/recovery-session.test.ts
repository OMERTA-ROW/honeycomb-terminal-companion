import { describe, expect, it } from 'vitest';
import { amrFromAccessToken, recoveryAllowed } from '@/lib/recovery-session';

const now = 1_800_000_000;
describe('password set gate', () => {
  it('allows a fresh invitation link session', () => expect(recoveryAllowed([{ method: 'invite', timestamp: now - 30 }], now)).toBe(true));
  it('allows a fresh recovery link session', () => expect(recoveryAllowed([{ method: 'recovery', timestamp: now - 30 }], now)).toBe(true));
  it('rejects ordinary password sign-in', () => expect(recoveryAllowed([{ method: 'password', timestamp: now }], now)).toBe(false));
  it('rejects Google/Lovable sign-in', () => expect(recoveryAllowed([{ method: 'oauth', timestamp: now }], now)).toBe(false));
  it('rejects a recovery session older than one hour', () => expect(recoveryAllowed([{ method: 'recovery', timestamp: now - 3601 }], now)).toBe(false));
  it('rejects missing session data', () => expect(recoveryAllowed(null, now)).toBe(false));
  it('reads amr from a token', () => {
    const payload = btoa(JSON.stringify({ amr: [{ method: 'invite', timestamp: now }] })).replace(/=+$/, '');
    expect(recoveryAllowed(amrFromAccessToken(`h.${payload}.s`), now)).toBe(true);
    expect(amrFromAccessToken('garbage')).toBe(null);
  });
});
