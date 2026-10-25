import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cancelCreativeTask, type CreativeTask } from '@/lib/creative-tasks';
import { bookPreviewAllowed, packages, previewHandoff, previewSchema, providerState, type CreativeKind, type CreativeProvider } from '@/lib/creative-package';
import { CreativeMedia } from './CreativeMedia';
import { supabase } from '@/integrations/supabase/client';

export function CreativeTasks() {
  const [tasks, setTasks] = useState<CreativeTask[]>([]);
  const [host, setHost] = useState(''), [project, setProject] = useState(''), [instruction, setInstruction] = useState('');
  const [tool, setTool] = useState<CreativeKind>('unity'), [review, setReview] = useState<CreativeTask | null>(null);
  const [loaded, setLoaded] = useState(false), [storageKey, setStorageKey] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]), [operations, setOperations] = useState<string[]>([]);
  const [provider, setProvider] = useState<CreativeProvider>('none'), [model, setModel] = useState<'none' | 'provider-default'>('none'), [agent, setAgent] = useState<'none' | 'omni'>('none');
  const [title, setTitle] = useState(''), [author, setAuthor] = useState(''), [isbn, setIsbn] = useState(''), [assignmentConfirmed, setAssignmentConfirmed] = useState(false);
  const [handoff, setHandoff] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoaded(false);
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      const key = `hc-creative-preview:${data.user?.id ?? 'signed-out'}`;
      setStorageKey(key); setTasks([]); setReview(null); setHandoff(null); setFiles([]);
      try {
        const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (Array.isArray(saved)) setTasks(saved.flatMap(t => { const parsed = previewSchema.safeParse(t); return parsed.success ? [parsed.data] : []; }));
      } catch { /* Unavailable/corrupt local storage is not a remote job. */ }
      setLoaded(true);
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    window.addEventListener('honeycomb-auth-change', load);
    return () => { alive = false; subscription.unsubscribe(); window.removeEventListener('honeycomb-auth-change', load); };
  }, []);
  useEffect(() => { if (loaded && storageKey) try { localStorage.setItem(storageKey, JSON.stringify(tasks)); } catch { /* Local preview only. */ } }, [tasks, loaded, storageKey]);
  const field = 'w-full mt-1 border rounded-md p-2 bg-background text-foreground text-sm';
  const pkg = packages[tool];
  const isbnAllowed = tool !== 'book' || bookPreviewAllowed(isbn, assignmentConfirmed);
  function inspect() {
    setReview({ id: crypto.randomUUID(), host, project, tool, instruction, state: 'preview-queued', createdAt: new Date().toISOString(), files: files.map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type })), operations, provider, model, agent, ...(tool === 'book' ? { book: { title, author, isbn, assignmentConfirmed } } : {}) });
  }
  return <section className="mt-6 border-t pt-5 min-w-0" aria-label="Creative packages">
    <h2 className="text-lg font-medium">Creative tasks · preview only</h2>
    <p className="text-xs text-warning mt-2">Transfer-first gate pending. Companion disconnected; all processing adapters and Omni orchestration unavailable. Nothing below executes or changes originals.</p>
    <div className="grid sm:grid-cols-2 gap-3 mt-4">
      <label>Desktop/laptop name · unverified<input aria-label="Creative host" className={field} value={host} onChange={e => setHost(e.target.value)} /></label>
      <label>Selected project · unverified<input aria-label="Creative project" className={field} value={project} onChange={e => setProject(e.target.value)} /></label>
    </div>
    <label className="block mt-3">Task type<select aria-label="Creative tool" className={field} value={tool} onChange={e => { setTool(e.target.value as CreativeKind); setOperations([]); setFiles([]); setReview(null); }}>{Object.entries(packages).map(([value, p]) => <option key={value} value={value}>{p.label}</option>)}</select></label>
    <fieldset className="mt-4"><legend className="text-sm">Proposed work</legend><div className="grid sm:grid-cols-2 gap-2 mt-2">{pkg.operations.map(op => <label key={op} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={operations.includes(op)} onChange={e => setOperations(prev => e.target.checked ? [...prev, op] : prev.filter(v => v !== op))} />{op}</label>)}</div></fieldset>
    <label className="block mt-4 text-sm">Selected files · local references only<input key={tool} aria-label="Creative selected files" type="file" multiple accept={pkg.accept || undefined} className="block mt-2 w-full text-sm" onChange={e => setFiles(Array.from(e.target.files ?? []))} /></label>
    <ul className="mt-2 text-xs text-muted-foreground space-y-1">{files.map((f, i) => <li key={i} className="break-words">{f.name} · {f.size} bytes</li>)}</ul>
    <CreativeMedia file={files.find(f => /^(audio|video)\//.test(f.type))} />
    <p className="mt-2 text-xs text-muted-foreground">Files are not uploaded. Contents are not retained; saved previews keep names and sizes only. File selection is not a Guardian access grant.</p>
    {tool === 'book' && <fieldset className="mt-4"><legend className="text-sm font-medium">Book metadata · owner supplied</legend><div className="grid sm:grid-cols-2 gap-3 mt-2"><label>Title<input aria-label="Book title" className={field} value={title} onChange={e => setTitle(e.target.value)} /></label><label>Author<input aria-label="Book author" className={field} value={author} onChange={e => setAuthor(e.target.value)} /></label></div><label className="block mt-3">Officially assigned ISBN · optional<input aria-label="Customer ISBN" className={field} value={isbn} onChange={e => { setIsbn(e.target.value); setAssignmentConfirmed(false); }} /></label><label className="flex items-start gap-2 text-sm mt-3"><input type="checkbox" checked={assignmentConfirmed} onChange={e => setAssignmentConfirmed(e.target.checked)} />I own this officially assigned ISBN.</label><p className="text-xs text-muted-foreground mt-2">Checksum only, not official assignment verification. No ISBN generation, publishing or distribution.</p>{!isbnAllowed && <p role="alert" className="text-xs text-warning mt-2">Correct the ISBN checksum and confirm assignment, or leave ISBN blank.</p>}</fieldset>}
    <fieldset className="mt-5 border-t pt-4"><legend className="text-sm font-medium">AI connection · unavailable</legend><div className="grid sm:grid-cols-3 gap-3 mt-2">
      <label>Provider<select aria-label="Creative provider" className={field} value={provider} onChange={e => setProvider(e.target.value as CreativeProvider)}><option value="none">None selected</option><option value="omni">Omni · disconnected</option><option value="lovable-ai">Lovable AI · disconnected</option><option value="external">External provider · unsupported</option><option value="local">Local model · unsupported</option></select></label>
      <label>Model<select aria-label="Creative model" className={field} value={model} onChange={e => setModel(e.target.value as typeof model)}><option value="none">None selected</option><option value="provider-default">Provider default · unverified</option></select></label>
      <label>Agent<select aria-label="Creative agent" className={field} value={agent} onChange={e => setAgent(e.target.value as typeof agent)}><option value="none">None selected</option><option value="omni">Omni · disconnected</option></select></label>
    </div><p role="status" className="mt-2 text-xs text-warning">{providerState(provider)} · no authenticated model catalog or agent connection. Model access never grants shell access.</p><Button variant="outline" disabled className="mt-3" title="Secure provider connection settings are not implemented">Secure provider settings unavailable</Button></fieldset>
    <label className="block mt-4">Idea or task<textarea aria-label="Creative instruction" className={field} rows={3} value={instruction} onChange={e => setInstruction(e.target.value)} /></label>
    <p className="mt-2 text-xs text-muted-foreground">Required: {pkg.prerequisite}. Output policy: {pkg.output}. Original files preserved; review before apply.</p>
    <Button variant="outline" className="mt-3" disabled={!loaded || !host.trim() || !project.trim() || !instruction.trim() || !isbnAllowed} onClick={inspect}>Inspect proposed task</Button>
    {review && <div className="mt-4 space-y-3" aria-label="Creative task review"><p className="text-sm break-words">{review.host} / {review.project}: {review.instruction}</p><p className="text-xs text-muted-foreground">{packages[review.tool].label} · {review.files?.length ?? 0} selected files · {review.provider} / {review.model} / {review.agent}</p><p className="text-xs text-muted-foreground">Requested scope: {review.operations?.join(', ') || 'No operations selected'}. Separate versioned output only; no write-to-original, shell, publication, spending or external-message permission. Guardian approval and recipient revalidation required.</p>{review.book && <p className="text-xs break-words">{review.book.title} · {review.book.author} · ISBN: {review.book.isbn || 'not supplied'} · assignment unverified</p>}<p className="text-xs text-warning">No generated diff, enhanced output, test evidence, artifact or checkpoint exists.</p><div className="flex flex-wrap gap-2"><Button onClick={() => { setTasks(prev => [review, ...prev]); setReview(null); }}>Save preview task locally</Button><Button variant="outline" onClick={() => setReview(null)}>Discard preview</Button></div></div>}
    <ul className="mt-4 space-y-3">{tasks.map(t => <li key={t.id} className="border rounded-md p-3 min-w-0"><p className="text-sm break-words">{t.instruction} · {t.host} / {t.project}</p><p className="text-xs text-muted-foreground break-all">{t.id} · {t.state} · device-local preview, never submitted</p><p className="text-xs mt-2">{packages[t.tool].label} · {t.files?.map(f => f.name).join(', ') || 'No file references'} · separate output only</p><div className="flex flex-wrap gap-2 mt-3"><Button variant="outline" disabled={t.state === 'cancelled'} onClick={() => { setTasks(prev => prev.map(v => v.id === t.id ? cancelCreativeTask(v) : v)); setHandoff(null); }}>Cancel preview task</Button><Button variant="outline" onClick={() => setHandoff(handoff === t.id ? null : t.id)}>Inspect handoff contract</Button>{['Process selected files', 'Run tests/build', 'Render preview', 'Compare before/after', 'Export separate output', 'Apply changes', 'Rollback', 'Send handoff'].map(label => <Button variant="outline" key={label} disabled title="Authorized adapter, current Guardian permission and real evidence required">{label}</Button>)}</div>{handoff === t.id && <pre className="mt-3 text-xs whitespace-pre-wrap break-all" aria-label="Preview handoff contract">{JSON.stringify(previewHandoff(t), null, 2)}</pre>}<p className="mt-2 text-xs text-warning">Waiting: authorized companion/adapter/provider unavailable. Reopening retains this preview ID; no job was dispatched.</p></li>)}</ul>
  </section>;
}
