/** Browser-only voice capture + transcription. Call only from event handlers. */
import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

export const VOICE_CONSENT_KEY = "honeycomb.voice.consent.v1";

function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((s, c) => s + c.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2); const v = new DataView(bytes);
  const tag = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  tag(0, "RIFF"); v.setUint32(4, 36 + length * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); tag(36, "data"); v.setUint32(40, length * 2, true);
  let o = 44;
  for (const c of chunks) for (const x of c) { const s = Math.max(-1, Math.min(1, x)); v.setInt16(o, s * (s < 0 ? 32768 : 32767), true); o += 2; }
  return new Blob([bytes], { type: "audio/wav" });
}

export type MicError = "denied" | "unsupported" | "failed";

export async function recordWav(maxMs = 30000): Promise<{ stop: () => Promise<File>; cancel: () => void }> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("This browser can't record audio."), { code: "unsupported" as MicError });
  let stream: MediaStream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError"); throw Object.assign(new Error(denied ? "Microphone permission was denied. Allow it in your browser settings, or type instead." : "Couldn't start the microphone."), { code: (denied ? "denied" : "failed") as MicError }); }
  const ctx = new AudioContext(); await ctx.resume();
  const src = ctx.createMediaStreamSource(stream); const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(node); node.connect(ctx.destination);
  let done = false;
  const end = async () => { done = true; stream.getTracks().forEach((t) => t.stop()); node.disconnect(); src.disconnect(); node.onaudioprocess = null; await ctx.close(); };
  const timer = setTimeout(() => { if (!done) void end(); }, maxMs);
  return {
    async stop() {
      clearTimeout(timer); if (!done) await end();
      const blob = encodeWav(chunks, ctx.sampleRate);
      if (blob.size < 8192) throw new Error("Recording was empty — hold the mic a little longer.");
      return new File([blob], "recording.wav", { type: "audio/wav" });
    },
    cancel() { clearTimeout(timer); if (!done) void end(); },
  };
}

/** Sends one clip to the signed-in transcription route; returns the final transcript. */
export async function transcribeClip(file: File, onDelta?: (text: string) => void): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in first to use voice.");
  const form = new FormData(); form.append("file", file, file.name);
  const r = await fetch("/api/transcribe", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (!r.ok || !r.body) {
    let msg = `Transcription failed (${r.status})`;
    try { const j = (await r.json()) as { error?: string | { message?: string }; message?: string }; msg = typeof j.error === "string" ? j.error : j.error?.message ?? j.message ?? msg; } catch { /* keep */ }
    if (r.status === 402) msg = "AI credits are used up — voice is paused.";
    if (r.status === 429) msg = "Too many requests — wait a moment.";
    throw new Error(msg);
  }
  let text = "", final: string | null = null, err: string | null = null;
  const parser = createParser({ onEvent: (ev) => {
    try {
      const j = JSON.parse(ev.data) as { type?: string; delta?: string; text?: string; error?: { message?: string } };
      if (j.type === "transcript.text.delta" && j.delta) { text += j.delta; onDelta?.(text); }
      else if (j.type === "transcript.text.done") final = j.text ?? text;
      else if (j.error) err = j.error.message ?? "Transcription error";
    } catch { /* ignore keepalives */ }
  } });
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) { const { value, done } = await reader.read(); if (done) break; parser.feed(value); }
  if (err) throw new Error(err);
  if (final === null) throw new Error("Transcription stream ended early — try again.");
  return (final as string).trim();
}
