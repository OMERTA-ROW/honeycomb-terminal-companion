import { describe, expect, it } from 'vitest';
import { profileSchema, sessionAllowed } from '@/lib/account-schema';
import { workspaceSelection, WORKSPACE_FILE_LIMIT, type WorkspaceEntry } from '@/lib/workspace';
describe('basic account constraints',()=>{
 it('accepts only display name and basic preferences',()=>{expect(profileSchema.safeParse({display_name:'Owner',preferences:{wifi_only:true}}).success).toBe(true);expect(profileSchema.safeParse({display_name:'Owner',preferences:{wifi_only:true},role:'admin'}).success).toBe(false);});
 it('does not allow roles in preferences',()=>{expect(profileSchema.safeParse({display_name:'Owner',preferences:{wifi_only:true,roles:['admin']}}).success).toBe(false);});
 it('rejects revoked current sessions',()=>{expect(sessionAllowed(100,0,true)).toBe(false);});
 it('rejects old sessions after global revocation',()=>{expect(sessionAllowed(100,100,false)).toBe(false);expect(sessionAllowed(101,100,false)).toBe(true);});
});
describe('account-local workspace',()=>{
 const entries=[{id:'1',owner:'alice',folder:'projects',name:'A'},{id:'2',owner:'bob',folder:'projects',name:'B'},{id:'3',owner:'alice',folder:'exports',name:'C'}] as WorkspaceEntry[];
 it('isolates account selections',()=>{expect(workspaceSelection(entries,'alice','projects').map(e=>e.id)).toEqual(['1']);});
 it('keeps folders separate',()=>{expect(workspaceSelection(entries,'alice','exports').map(e=>e.id)).toEqual(['3']);});
 it('preserves the existing safe selected-file limit',()=>{expect(WORKSPACE_FILE_LIMIT).toBe(5242880);});
});