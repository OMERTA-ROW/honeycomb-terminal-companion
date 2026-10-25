import {describe,it,expect} from 'vitest';
import {sha256,verifyIntegrity,base64ToBytes,bytesToBase64,proofMessage,FILE_LIMIT,PAIR_TTL_SECONDS,PAIR_ATTEMPTS} from '@/lib/transfer-shared';
import {creativeCanExecute,cancelCreativeTask} from '@/lib/creative-tasks';
describe('Selected-file integrity',()=>{
 it('accepts actual intact bytes',async()=>{const b=new TextEncoder().encode('Honeycomb selected document');expect(await verifyIntegrity(b,await sha256(b),b.length)).toBe(true);});
 it('rejects corrupted bytes',async()=>{const b=new Uint8Array([0,1,2,255]);const hash=await sha256(b);b[1]=8;expect(await verifyIntegrity(b,hash,4)).toBe(false);});
 it('rejects truncated bytes',async()=>{const b=new Uint8Array([1,2]);expect(await verifyIntegrity(b,await sha256(b),3)).toBe(false);});
 it('preserves every byte in relay encoding',()=>{const b=Uint8Array.from({length:256},(_,i)=>i);expect(base64ToBytes(bytesToBase64(b))).toEqual(b);});
 it('binds device proof to operation and file scope',()=>{expect(proofMessage('nonce','read',{id:'one'})).not.toEqual(proofMessage('nonce','read',{id:'two'}));expect(proofMessage('nonce','read',{})).not.toEqual(proofMessage('nonce','revoke',{}));});
 it('enforces preview limits',()=>{expect(FILE_LIMIT).toBe(5242880);expect(PAIR_TTL_SECONDS).toBe(120);expect(PAIR_ATTEMPTS).toBe(5);});
});
describe('Creative milestone boundaries',()=>{it('never dispatches unavailable adapters',()=>expect(creativeCanExecute()).toBe(false));it('cancels without changing job identity',()=>{const t={id:'123',host:'Mac',project:'disposable',tool:'unity' as const,instruction:'small change',state:'preview-queued' as const,createdAt:'now'};expect(cancelCreativeTask(t)).toEqual({...t,state:'cancelled'});});});
