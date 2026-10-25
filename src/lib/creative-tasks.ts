import type { CreativeKind, CreativeProvider, SelectedCreativeFile } from './creative-package';
export interface CreativeTask { id: string; host: string; project: string; tool: CreativeKind; instruction: string; state: 'preview-queued'|'cancelled'; createdAt: string; files?: SelectedCreativeFile[]; operations?: string[]; provider?: CreativeProvider; model?: 'none'|'provider-default'; agent?: 'none'|'omni'; book?: {title: string; author: string; isbn: string; assignmentConfirmed: boolean} }
export function cancelCreativeTask(task: CreativeTask): CreativeTask { return {...task,state:'cancelled'}; }
export function creativeCanExecute(): boolean { return false; }
