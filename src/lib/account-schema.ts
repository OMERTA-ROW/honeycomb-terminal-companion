import { z } from 'zod';
export const profileSchema = z.object({ display_name: z.string().trim().max(60), preferences: z.object({ wifi_only: z.boolean() }).strict() }).strict();
export function sessionAllowed(iat: number, cutoff: number, revoked: boolean) { return Number.isFinite(iat) && iat > cutoff && !revoked; }