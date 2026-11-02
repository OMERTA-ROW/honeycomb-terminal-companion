/** Account-keyed IndexedDB storage for downloaded bytes. Bytes are kept as opaque blobs and never opened or executed. */
export interface DownloadRecord {
  id: string;
  account: string;
  url: string;
  filename: string;
  total: number | null;
  received: number;
  etag: string | null;
  expectedSha256: string | null;
  actualSha256: string | null;
  verify: "verified" | "mismatch" | "unverified";
  status: "queued" | "downloading" | "paused" | "error" | "complete";
  error: string | null;
  createdAt: number;
}

const DB = "honeycomb-downloads";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore("records", { keyPath: "id" }).createIndex("account", "account");
      db.createObjectStore("chunks", { autoIncrement: true }).createIndex("dl", "dl");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function done(tx: IDBTransaction) {
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
}

export async function listDownloads(account: string): Promise<DownloadRecord[]> {
  const db = await open();
  return new Promise((res, rej) => {
    const q = db.transaction("records").objectStore("records").index("account").getAll(account);
    q.onsuccess = () => res((q.result as DownloadRecord[]).sort((a, b) => b.createdAt - a.createdAt));
    q.onerror = () => rej(q.error);
  });
}

export async function saveRecord(rec: DownloadRecord) {
  const db = await open();
  const tx = db.transaction("records", "readwrite");
  tx.objectStore("records").put(rec);
  await done(tx);
}

/** Appends one chunk and updates the record atomically so resume offsets always match stored bytes. */
export async function appendChunk(rec: DownloadRecord, blob: Blob) {
  const db = await open();
  const tx = db.transaction(["records", "chunks"], "readwrite");
  tx.objectStore("chunks").add({ dl: rec.id, blob });
  tx.objectStore("records").put(rec);
  await done(tx);
}

async function chunkKeys(db: IDBDatabase, id: string): Promise<{ blobs: Blob[]; keys: IDBValidKey[] }> {
  return new Promise((res, rej) => {
    const idx = db.transaction("chunks").objectStore("chunks").index("dl");
    const blobs: Blob[] = [], keys: IDBValidKey[] = [];
    const c = idx.openCursor(IDBKeyRange.only(id));
    c.onsuccess = () => {
      const cur = c.result;
      if (!cur) return res({ blobs, keys });
      blobs.push((cur.value as { blob: Blob }).blob);
      keys.push(cur.primaryKey);
      cur.continue();
    };
    c.onerror = () => rej(c.error);
  });
}

export async function assemble(id: string): Promise<Blob> {
  const db = await open();
  const { blobs } = await chunkKeys(db, id);
  return new Blob(blobs, { type: "application/octet-stream" });
}

export async function clearChunks(id: string) {
  const db = await open();
  const { keys } = await chunkKeys(db, id);
  const tx = db.transaction("chunks", "readwrite");
  for (const k of keys) tx.objectStore("chunks").delete(k);
  await done(tx);
}

export async function deleteDownload(id: string) {
  await clearChunks(id);
  const db = await open();
  const tx = db.transaction("records", "readwrite");
  tx.objectStore("records").delete(id);
  await done(tx);
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
