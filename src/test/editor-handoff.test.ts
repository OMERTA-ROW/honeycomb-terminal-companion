import {describe,it,expect} from 'vitest';
import {editorHandoffBlock,type EditorCapability} from '@/lib/editor-handoff';
const allowed:EditorCapability={hostId:'host-a',workspaceId:'workspace-a',paired:true,revoked:false,online:true,adapterVerified:true,workspaceApproved:true,vsCodeDetected:true,browserRemoteConfigured:true};
describe('Editor adapter contract capability gates (not live authorization)',()=>{
 it('blocks unavailable adapter instead of launching a link',()=>expect(editorHandoffBlock(null,'desktop')).not.toBeNull());
 it('denies revoked trust',()=>expect(editorHandoffBlock({...allowed,revoked:true},'desktop')).toBe('Device trust missing or revoked.'));
 it('requires approved workspace',()=>expect(editorHandoffBlock({...allowed,workspaceApproved:false},'desktop')).toBe('Workspace approval required.'));
 it('requires paired host',()=>expect(editorHandoffBlock({...allowed,paired:false},'desktop')).not.toBeNull());
 it('denies offline host',()=>expect(editorHandoffBlock({...allowed,online:false},'desktop')).toBe('Selected host is offline.'));
 it('requires verified adapter',()=>expect(editorHandoffBlock({...allowed,adapterVerified:false},'desktop')).toBe('Host adapter is unverified.'));
 it('requires detected editor',()=>expect(editorHandoffBlock({...allowed,vsCodeDetected:false},'desktop')).not.toBeNull());
 it('requires browser remote setup separately',()=>{const caps={...allowed,browserRemoteConfigured:false};expect(editorHandoffBlock(caps,'browser')).not.toBeNull();expect(editorHandoffBlock(caps,'desktop')).toBeNull();});
});
