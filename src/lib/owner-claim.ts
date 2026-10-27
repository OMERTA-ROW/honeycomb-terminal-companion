/** Pure, browser-safe owner/membership decisions shared by server functions and tests. */
export type MembershipState = { state: 'member'; role: 'owner' | 'admin' | 'member' } | { state: 'revoked' } | { state: 'no_membership'; ownerClaimable: boolean };

export function normEmail(e: string | null | undefined) { return (e ?? '').trim().toLowerCase(); }

/** Only a provider-verified address equal to the server-configured owner email may claim, and only while no owner exists. */
export function ownerClaimAllowed(input: { configured?: string | null; email?: string | null; emailVerified: boolean; ownerExists: boolean; hasRole: boolean }) {
  const c = normEmail(input.configured);
  return Boolean(c) && input.emailVerified && !input.ownerExists && !input.hasRole && normEmail(input.email) === c;
}

export function membershipState(role: string | null, sessionAllowed: boolean, ownerClaimable: boolean): MembershipState {
  if (role === 'owner' || role === 'admin' || role === 'member') return sessionAllowed ? { state: 'member', role } : { state: 'revoked' };
  return { state: 'no_membership', ownerClaimable };
}
