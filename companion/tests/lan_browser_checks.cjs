const vm = require('node:vm');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(0, 'utf8');
async function fixture(paired = false) {
  const elements = new Map(), events = {}, timers = new Map(), sockets = [];
  let id = 0, now = 1000;
  const element = key => {
    if (!elements.has(key)) elements.set(key, { textContent: '', value: '', disabled: false, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, files: [], clientWidth: 500, clientHeight: 400, focus() {}, selectionStart: 0, selectionEnd: 0 });
    return elements.get(key);
  };
  let response = async path => ({ ok: true, json: async () => path === '/api/state' ? { paired, fingerprint: 'ab'.repeat(32) } : { destinations: ['Inbox'] } });
  class Socket {
    constructor() { this.readyState = 0; this.sent = []; sockets.push(this); }
    send(d) { this.sent.push(JSON.parse(d)); }
    close() { this.readyState = 3; this.onclose?.({ code: 1001 }); }
  }
  const context = vm.createContext({ document: { getElementById: element, querySelectorAll: () => [], addEventListener: (k, fn) => events[k] = fn, hidden: false }, navigator: { onLine: true }, location: { host: '127.0.0.1:8765', hash: '', pathname: '/', reload() {} }, history: { replaceState() {} }, addEventListener: (k, fn) => events[k] = fn, fetch: (...args) => response(...args), AbortController, TextDecoder, Blob, WebSocket: Socket, Date: { now: () => now }, setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, clearTimeout: n => timers.delete(n), setInterval: (fn, delay) => { timers.set(++id, { fn, delay, interval: true }); return id; }, clearInterval: n => timers.delete(n), confirm: () => true });
  vm.runInContext(source, context);
  const settle = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
  await settle();
  return { element, events, timers, sockets, settle, now: n => now = n, respond: fn => response = fn, tick: async delay => { const entry = [...timers].find(([, t]) => t.delay === delay); assert.ok(entry, `timer ${delay} exists`); if (!entry[1].interval) timers.delete(entry[0]); entry[1].fn(); await settle(); } };
}
(async () => {
  for (const kind of ['network', 'json']) {
    const f = await fixture();
    f.respond(async () => { if (kind === 'network') throw new Error('offline'); return { ok: true, json: async () => { throw new Error('bad json'); } }; });
    await f.element('pairBtn').onclick();
    assert.equal(f.element('pairBtn').disabled, false);
    assert.match(f.element('pairMsg').textContent, /Request failed/);
  }
  {
    const f = await fixture(); let polls = 0;
    f.respond(async path => { if (path.startsWith('/api/pair/status') && ++polls === 1) throw new Error('offline'); return { ok: true, json: async () => path === '/api/pair' ? { id: 'fixture', secret: 'fixture' } : { status: 'pending' } }; });
    const first = f.element('pairBtn').onclick(); await f.element('pairBtn').onclick(); await first; await f.settle();
    assert.equal(polls, 1); assert.equal(f.element('pairBtn').disabled, true);
    assert.match(f.element('pairMsg').textContent, /Retrying the same request/);
    await f.tick(3000); assert.equal(polls, 2);
  }
  {
    const f = await fixture(true), old = f.sockets[0];
    old.close(); f.events.online(); assert.equal(f.sockets.length, 2);
    assert.equal([...f.timers.values()].filter(t => t.delay === 2000).length, 0);
    old.onclose({ code: 4401 }); assert.equal(f.sockets.length, 2);
    const socket = f.sockets[1]; socket.readyState = 1; socket.onopen();
    assert.doesNotMatch(f.element('status').textContent, /^Connected/);
    socket.onmessage({ data: JSON.stringify({ t: 'pong' }) });
    assert.match(f.element('status').textContent, /^Connected/);
    f.now(40001); await f.tick(10000); assert.equal(socket.readyState, 3);
  }
  {
    const f = await fixture(true), socket = f.sockets[0];
    socket.onclose({ code: 4401 }); f.events.online();
    assert.equal(f.sockets.length, 1);
    assert.match(f.element('status').textContent, /Permission needed/);
  }
  console.log('5 LAN browser regression scenarios passed');
})().catch(e => { console.error(e); process.exitCode = 1; });