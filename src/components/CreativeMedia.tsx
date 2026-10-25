import { useEffect, useState } from 'react';

export function CreativeMedia({ file }: { file: File | undefined }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file || !/^(audio|video)\//.test(file.type)) { setUrl(''); return; }
    const next = URL.createObjectURL(file); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url || !file) return null;
  return <div className="mt-3 min-w-0"><p className="text-xs text-muted-foreground mb-2">Original · {file.name}</p>{file.type.startsWith('audio/') ? <audio aria-label="Original recording" controls src={url} className="w-full" /> : <video aria-label="Original clip" controls src={url} className="w-full max-h-64" />}<p className="text-xs text-warning mt-2">Enhanced before/after output unavailable; no processing performed.</p></div>;
}