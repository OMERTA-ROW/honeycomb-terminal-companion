import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(['admin', 'member']),
  hours: z.number().int().min(1).max(168),
}).strict();

export const tokenSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  email: z.string().trim().toLowerCase().email().max(254),
}).strict();

export type Role = 'owner' | 'admin' | 'member';
/** UI hint only; the database functions are the authority. */
export const canInvite = (r: Role | null, target: 'admin' | 'member') => r === 'owner' || (r === 'admin' && target === 'member');
