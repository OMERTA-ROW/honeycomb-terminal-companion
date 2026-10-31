import { describe, expect, it } from 'vitest';
import { deriveStatuses, hostState } from './feature-status';

const now = Date.parse('2026-10-31T21:00:00Z');
const base = { membership: 'member' as const, role: 'owner', hostsError: false, now };
const get = (s: ReturnType<typeof deriveStatuses>, id: string) => s.find((x) => x.id === id)!;

describe('owner dashboard truthfulness', () => {
  it('browser terminal is always simulated, never live', () => expect(get(deriveStatuses({ ...base, hosts: [] }), 'sandbox').state).toBe('simulated'));
  it('Mac is live only with a heartbeat within 2 minutes', () => {
    const h = { id: '1', name: 'Mac', os: 'macOS', revoked_at: null };
    expect(hostState({ ...h, last_seen: '2026-10-31T20:59:00Z' }, now)).toBe('live');
    expect(hostState({ ...h, last_seen: '2026-10-31T20:57:00Z' }, now)).toBe('pending');
    expect(hostState({ ...h, last_seen: null }, now)).toBe('pending');
  });
  it('a revoked Mac is failed even with a fresh heartbeat', () => expect(hostState({ id: '1', name: 'M', os: 'm', last_seen: '2026-10-31T21:00:00Z', revoked_at: '2026-10-31T20:00:00Z' }, now)).toBe('failed'));
  it('no enrolled Mac is test pending, not live', () => expect(get(deriveStatuses({ ...base, hosts: [] }), 'mac').state).toBe('pending'));
  it('revoked session shows account failed', () => expect(get(deriveStatuses({ ...base, membership: 'revoked', hosts: null }), 'account').state).toBe('failed'));
  it('same-Wi-Fi shell is never shown live from the website', () => expect(get(deriveStatuses({ ...base, hosts: [] }), 'lan').state).toBe('pending'));
});
