import { describe, expect, it } from 'vitest';
import { membershipState, ownerClaimAllowed } from '@/lib/owner-claim';
const base = { configured: 'Owner@Example.test', email: 'owner@example.test', emailVerified: true, ownerExists: false, hasRole: false };
describe('owner claim', () => {
  it('allows the verified configured owner address', () => expect(ownerClaimAllowed(base)).toBe(true));
  it('rejects a different Google account', () => expect(ownerClaimAllowed({ ...base, email: 'someone@example.test' })).toBe(false));
  it('rejects an unverified address', () => expect(ownerClaimAllowed({ ...base, emailVerified: false })).toBe(false));
  it('rejects when an owner already exists', () => expect(ownerClaimAllowed({ ...base, ownerExists: true })).toBe(false));
  it('rejects when no owner email is configured', () => expect(ownerClaimAllowed({ ...base, configured: '' })).toBe(false));
  it('rejects an account that already has a role', () => expect(ownerClaimAllowed({ ...base, hasRole: true })).toBe(false));
});
describe('membership state', () => {
  it('member with allowed session', () => expect(membershipState('member', true, false)).toEqual({ state: 'member', role: 'member' }));
  it('role but revoked session is revoked, not no-membership', () => expect(membershipState('owner', false, false)).toEqual({ state: 'revoked' }));
  it('no role is no membership', () => expect(membershipState(null, false, false)).toEqual({ state: 'no_membership', ownerClaimable: false }));
});
