export const WORKSPACE_FOLDERS = ['projects', 'exports', 'session-logs'] as const;
export type WorkspaceFolder = typeof WORKSPACE_FOLDERS[number];
export type WorkspaceEntry = { id: string; owner: string; folder: WorkspaceFolder; name: string; created: number; bytes: number; blob: Blob };
export const WORKSPACE_FILE_LIMIT = 5 * 1024 * 1024;
export function workspaceSelection(entries: WorkspaceEntry[], owner: string, folder: WorkspaceFolder) { return entries.filter(e => e.owner === owner && e.folder === folder); }
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => { const request = indexedDB.open('honeycomb-workspace',1); request.onupgradeneeded=()=>request.result.createObjectStore('entries',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Browser storage unavailable.')); });
}
export async function workspaceEntries(owner: string) {
  const db=await database();return new Promise<WorkspaceEntry[]>((resolve,reject)=>{const tx=db.transaction('entries','readonly'),r=tx.objectStore('entries').getAll();r.onsuccess=()=>resolve((r.result as WorkspaceEntry[]).filter(e=>e.owner===owner));r.onerror=()=>reject(new Error('Workspace could not be opened.'));tx.oncomplete=()=>db.close();});
}
export async function workspaceImport(owner: string, folder: WorkspaceFolder, file: File): Promise<WorkspaceEntry> {
  if (!owner || !WORKSPACE_FOLDERS.includes(folder) || file.size>WORKSPACE_FILE_LIMIT) throw new Error('Choose a file of 5 MiB or less.');
  const entry:WorkspaceEntry={id:crypto.randomUUID(),owner,folder,name:file.name,created:Date.now(),bytes:file.size,blob:file};
  const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').add(entry);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Storage full or unavailable. Original file was not changed.'));};});return entry;
}
export async function workspaceRemove(owner: string, id: string) {
  const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries'),read=store.get(id);read.onsuccess=()=>{if(read.result?.owner===owner)store.delete(id);};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Local copy could not be removed.'));};});
}