/** Client-safe contract for a future authorized adapter, not a live integration. */
export type EditorMode = 'desktop' | 'browser';
export interface EditorCapability {
  hostId: string;
  workspaceId: string;
  paired: boolean;
  revoked: boolean;
  online: boolean;
  adapterVerified: boolean;
  workspaceApproved: boolean;
  vsCodeDetected: boolean;
  browserRemoteConfigured: boolean;
}
export interface EditorHandoffRequest {
  version: 1;
  requestId: string;
  hostId: string;
  workspaceId: string;
  mode: EditorMode;
  approvalId: string;
  expectedWorkspaceRevision: string;
}
export function editorHandoffBlock(capability: EditorCapability | null, mode: EditorMode): string | null {
  if (!capability) return 'Host adapter unavailable — no verified editor capabilities.';
  if (!capability.paired || capability.revoked) return 'Device trust missing or revoked.';
  if (!capability.workspaceApproved) return 'Workspace approval required.';
  if (!capability.online) return 'Selected host is offline.';
  if (!capability.adapterVerified) return 'Host adapter is unverified.';
  if (!capability.vsCodeDetected) return 'VS Code is unavailable on the selected host.';
  if (mode === 'browser' && !capability.browserRemoteConfigured) return 'Authorized browser remote editing is not configured.';
  return null;
}
