import { z } from 'zod';

export const packages = {
  audio: { label: 'Audio / vocals', accept: 'audio/*', operations: ['Noise cleanup', 'Clarity / vocal enhancement', 'Volume normalization', 'EQ'], prerequisite: 'Authorized audio tool adapter or configured processing provider', output: 'Separate enhanced recording; before/after audition' },
  video: { label: 'Video / movie', accept: 'video/*,audio/*', operations: ['Proposed clip edits', 'Audio / video cleanup', 'Render preview'], prerequisite: 'Supported editor automation/export adapter and installed licensed tool', output: 'Separate rendered preview and export' },
  book: { label: 'Book / manuscript', accept: '.txt,.md,.docx,.pdf,.epub,image/*', operations: ['Manuscript editing / formatting', 'Cover / barcode placement', 'Metadata / print-ready export'], prerequisite: 'Authorized document/layout adapter, printer specifications and assigned ISBN evidence', output: 'Separate manuscript/layout and print-ready export; no submission' },
  unity: { label: 'Game / Unity', accept: '', operations: ['Code / asset proposal', 'Tests / build', 'Preview artifacts'], prerequisite: 'Authorized Unity/tool adapter, installed version/license and approved disposable project', output: 'Versioned copy, diff, test/build evidence and preview artifacts' },
  browser: { label: 'Desktop-browser document submission', accept: '', operations: ['Review selected document'], prerequisite: 'Authorized per-site host browser adapter; final submission approval', output: 'Document handoff only; submission unavailable' },
} as const;
export type CreativeKind = keyof typeof packages;
export const providers = ['none', 'omni', 'lovable-ai', 'external', 'local'] as const;
export type CreativeProvider = typeof providers[number];
export function providerState(provider: CreativeProvider): 'disconnected' | 'unsupported' { return provider === 'external' || provider === 'local' ? 'unsupported' : 'disconnected'; }
export const outputPolicy = { overwriteOriginals: false, separateOutput: true, reviewBeforeApply: true } as const;

const fileSchema = z.object({ id: z.string(), name: z.string(), size: z.number().nonnegative(), type: z.string() }).strip();
export type SelectedCreativeFile = z.infer<typeof fileSchema>;
export const previewSchema = z.object({
  id: z.string(), host: z.string(), project: z.string(), tool: z.enum(['unity','video','browser','audio','book']),
  instruction: z.string(), state: z.enum(['preview-queued','cancelled']), createdAt: z.string(),
  files: z.array(fileSchema).default([]), operations: z.array(z.string()).default([]),
  provider: z.enum(providers).default('none'), model: z.enum(['none','provider-default']).default('none'),
  agent: z.enum(['none','omni']).default('none'),
  book: z.object({ title: z.string(), author: z.string(), isbn: z.string(), assignmentConfirmed: z.boolean() }).strip().optional(),
}).strip();

// Checksum is only a syntax check, never proof of official assignment or ownership.
export function isbnSyntaxValid(input: string): boolean {
  const s = input.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) return [...s].reduce((sum,c,i)=>sum+(c==='X'?10:Number(c))*(10-i),0)%11===0;
  return /^97[89]\d{10}$/.test(s) && [...s].reduce((sum,c,i)=>sum+Number(c)*(i%2?3:1),0)%10===0;
}
export function bookPreviewAllowed(isbn: string, confirmed: boolean): boolean { return !isbn.trim() || (confirmed && isbnSyntaxValid(isbn)); }

// Inert preview envelope. Local references are NOT recipient-authorized resource IDs.
export function previewHandoff(value: unknown) {
  const t = previewSchema.parse(value);
  return {
    version: 1 as const, taskId: t.id, idempotencyKey: t.id, capability: t.tool,
    choice: { provider: t.provider, model: t.model, agent: t.agent, status: providerState(t.provider) },
    selection: { hostReference: null, projectReference: null, fileReferences: t.files.map(f=>f.id) },
    requestedScope: { operations: t.operations.filter(o=>(packages[t.tool].operations as readonly string[]).includes(o)), ...outputPolicy },
    authorization: { status: 'not-granted' as const, recipientMustRevalidate: true },
    expectedRevision: null, artifacts: [], logReferences: [], cancellation: t.state==='cancelled'?'cancelled':'not-requested',
    dispatch: 'unavailable' as const,
  };
}