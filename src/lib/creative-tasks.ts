export interface CreativeTask { id: string; host: string; project: string; tool: 'unity'|'video'|'browser'; instruction: string; state: 'preview-queued'|'cancelled'; createdAt: string }
export function cancelCreativeTask(task: CreativeTask): CreativeTask { return {...task,state:'cancelled'}; }
export function creativeCanExecute(): boolean { return false; }
