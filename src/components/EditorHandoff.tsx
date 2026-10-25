import {useState} from 'react';
import {Monitor,Globe,Code2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {editorHandoffBlock,type EditorMode} from '@/lib/editor-handoff';
export function EditorHandoff(){
 const [mode,setMode]=useState<EditorMode>('desktop');
 const [workspace,setWorkspace]=useState('');
 const [review,setReview]=useState(false);
 const blocked=editorHandoffBlock(null,mode);
 return <section aria-labelledby="editor-title" className="mt-6 border-t pt-5">
  <h2 id="editor-title" className="flex items-center gap-2 text-lg font-medium"><Code2 className="h-5 w-5 text-primary" aria-hidden="true"/>VS Code handoff</h2>
  <p className="mt-2 text-xs text-warning">Disconnected · no verified desktop companion or editor adapter. Transfer verification comes first.</p>
  <div className="mt-4 grid gap-3 sm:grid-cols-2">
   <label className="text-sm">Paired execution host<select aria-label="VS Code paired host" disabled className="mt-1 w-full rounded-md border bg-background p-2 text-sm disabled:opacity-60"><option>No authorized execution host available</option></select></label>
   <label className="text-sm">Workspace request · not approved<input aria-label="VS Code workspace request" value={workspace} onChange={e=>{setWorkspace(e.target.value);setReview(false);}} placeholder="Project/workspace name" maxLength={120} className="mt-1 w-full rounded-md border bg-background p-2 text-sm"/></label>
  </div>
  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="VS Code handoff mode">
   <Button variant="outline" aria-pressed={mode==='desktop'} onClick={()=>{setMode('desktop');setReview(false);}}><Monitor aria-hidden="true"/>Desktop VS Code</Button>
   <Button variant="outline" aria-pressed={mode==='browser'} onClick={()=>{setMode('browser');setReview(false);}}><Globe aria-hidden="true"/>Browser remote editing</Button>
  </div>
  <p className="mt-3 text-xs text-muted-foreground">{mode==='desktop'?'An authorized host adapter must open the selected workspace on that desktop. A link from this phone does not open files on another computer.':'Requires an already authorized host remote tunnel and supported browser tools/extensions. vscode.dev alone does not provide remote host access.'}</p>
  <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={!workspace.trim()} onClick={()=>setReview(true)}>Review handoff requirements</Button><Button disabled title={blocked??undefined}>Open approved workspace</Button></div>
  {review&&<div role="status" className="mt-3 space-y-2 text-sm"><p className="break-words">Workspace request: {workspace} · {mode==='desktop'?'desktop':'browser'}</p><p className="text-warning">{blocked} Nothing was sent or opened.</p><p className="text-xs text-muted-foreground">Guardian must approve the exact host/workspace and check revocation. Commands require separate approval. Testing uses an isolated copy; review precedes applying changes. Credentials stay with the authorized host/provider.</p><Button variant="outline" onClick={()=>setReview(false)}>Dismiss review</Button></div>}
 </section>;
}
