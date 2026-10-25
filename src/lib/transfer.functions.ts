import { createServerFn } from '@tanstack/react-start';
import { requireActiveAccount } from './account.functions';
import { z } from 'zod';
import { base64ToBytes, proofMessage } from './transfer-shared';
import type { Json } from '@/integrations/supabase/types';

const uuid = z.string().uuid();
export const registerDevice = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ name: z.string().trim().min(1).max(60), key: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: z.string().max(100), y: z.string().max(100) }) })).handler(async ({ data, context }) => {
  await crypto.subtle.importKey('jwk', data.key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { count } = await supabaseAdmin.from('hc_devices').select('id', { count: 'exact', head: true }).eq('owner_id', context.userId).is('revoked_at', null);
  if ((count ?? 0) >= 12) throw new Error('Revoke an unused device before registering another.');
  const { data: device, error } = await supabaseAdmin.from('hc_devices').insert({ owner_id: context.userId, name: data.name, public_key: data.key }).select('id').single();
  if (error || !device) throw new Error('Registration unavailable. Try again.');
  await supabaseAdmin.from('hc_audit').insert({ owner_id: context.userId, device_id: device.id, event: 'register' });
  return { id: device.id };
});
export const deviceChallenge = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ device: uuid })).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: device } = await supabaseAdmin.from('hc_devices').select('id,revoked_at').eq('id', data.device).eq('owner_id', context.userId).single();
  if (!device || device.revoked_at) throw new Error('Device unauthorized or revoked.');
  await supabaseAdmin.from('hc_proofs').delete().eq('device_id', data.device).lt('expires_at', new Date().toISOString());
  const { count } = await supabaseAdmin.from('hc_proofs').select('id', { count: 'exact', head: true }).eq('device_id', data.device).eq('used', false).gt('expires_at', new Date().toISOString());
  if ((count ?? 0) > 100) throw new Error('Too many requests. Wait a minute.');
  const { data: proof, error } = await supabaseAdmin.from('hc_proofs').insert({ device_id: data.device, owner_id: context.userId }).select('id').single();
  if (!proof || error) throw new Error('Device proof unavailable.');
  return { proof: proof.id };
});
const operation = z.enum(['list','issue','claim','approve','reject','revoke','offer','chunk','read','finish','complete','cancel','fail']);
export const guardianAction = createServerFn({ method: 'POST' }).middleware([requireActiveAccount]).inputValidator(z.object({ device: uuid, proof: uuid, signature: z.string().max(200), op: operation, payload: z.record(z.unknown()) })).handler(async ({ data, context }) => {
  if (JSON.stringify(data.payload).length > 90000) throw new Error('Request too large.');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: device } = await supabaseAdmin.from('hc_devices').select('public_key,revoked_at').eq('id', data.device).eq('owner_id', context.userId).single();
  if (!device || device.revoked_at) throw new Error('Device unauthorized or revoked.');
  const key = await crypto.subtle.importKey('jwk', device.public_key as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, new Uint8Array(base64ToBytes(data.signature)).buffer, new Uint8Array(proofMessage(data.proof, data.op, data.payload)).buffer);
  if (!valid) throw new Error('Device signature invalid.');
  const { data: result, error } = await supabaseAdmin.rpc('hc_action', { p_owner: context.userId, p_device: data.device, p_proof: data.proof, p_op: data.op, p_data: data.payload as Json });
  if (error) {
    await supabaseAdmin.from('hc_audit').insert({ owner_id: context.userId, device_id: data.device, event: 'guardian_denied' });
    const allowed = ['Device unauthorized or revoked','Proof expired or replayed','Pairing expired or already consumed','Device identity changed or revoked','Device not owned','Recipient offline or revoked','Recipient is not approved','Named recipient approval required','Finish or cancel existing transfers first','File permission denied','Trust revoked','Transfer expired','Upload not permitted','Invalid chunk or replay','Download not permitted','Upload incomplete','Receipt not permitted','Transfer already closed','File integrity mismatch'];
    throw new Error(allowed.find(s => error.message.includes(s)) ?? 'Guardian denied the request.');
  }
  if (result && typeof result === 'object' && !Array.isArray(result) && typeof result['error'] === 'string') throw new Error(result['error']);
  return result;
});
