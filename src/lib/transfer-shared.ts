export const FILE_LIMIT = 5 * 1024 * 1024;
export const CHUNK_SIZE = 65536;
export const PAIR_TTL_SECONDS = 120;
export const PAIR_ATTEMPTS = 5;
export function bytesToBase64(bytes: Uint8Array): string { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
export function base64ToBytes(s: string): Uint8Array { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
export async function sha256(bytes: Uint8Array): Promise<string> { const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer); return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join(''); }
export async function verifyIntegrity(bytes: Uint8Array, hash: string, size: number): Promise<boolean> { return bytes.length === size && await sha256(bytes) === hash; }
export function proofMessage(proof: string, op: string, data: Record<string, unknown>): Uint8Array { return new TextEncoder().encode(JSON.stringify([proof, op, data])); }
export interface Device { id: string; name: string; revoked_at: string | null; last_seen: string }
export interface PairRequest { id: string; issuer: string; claimant: string | null; state: string; expires_at: string }
export interface Trust { device_a: string; device_b: string }
export interface Transfer { id: string; sender: string; recipient: string; name: string; size: number; sha256: string; state: string; expires_at: string; received_bytes: number }
export interface TransferState { devices: Device[]; requests: PairRequest[]; trust: Trust[]; transfers: Transfer[]; audit: { event: string; created_at: string; device_id: string; resource_id: string | null }[] }
