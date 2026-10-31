"""Self-served mobile terminal page for LAN mode (no external scripts/CDNs)."""

ICON = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0b0904"/><polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="none" stroke="#d4a72c" stroke-width="7"/><text x="50" y="60" font-size="26" text-anchor="middle" fill="#d4a72c" font-family="monospace">&gt;_</text></svg>"""

MANIFEST = """{"name":"Honeycomb Terminal (Mac, local network)","short_name":"Honeycomb","start_url":"/","display":"standalone","background_color":"#0b0904","theme_color":"#0b0904","icons":[{"src":"/icon.svg","sizes":"any","type":"image/svg+xml"}]}"""

HTML = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Honeycomb">
<meta name="theme-color" content="#0b0904"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icon.svg">
<title>Honeycomb Terminal — Mac on local network</title>
<style>
:root{--bg:#0b0904;--panel:#15110a;--gold:#d4a72c;--gold2:#f1cf6b;--text:#efe6cf;--muted:#9c8f72;--bad:#e2604f;--ok:#7fc77a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.4 -apple-system,system-ui,sans-serif;padding:env(safe-area-inset-top) 10px 10px}
header{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:10px 4px;border-bottom:1px solid #4a3a12}
h1{font-size:16px;margin:0;color:var(--gold2);letter-spacing:.04em}.pill{border:1px solid var(--gold);border-radius:99px;padding:2px 10px;font-size:12px}
.pill.live{color:var(--ok);border-color:var(--ok)}.pill.bad{color:var(--bad);border-color:var(--bad)}
.panel{background:var(--panel);border:1px solid #6b5418;border-radius:10px;padding:14px;margin:12px 0}
button,input,textarea{font:inherit;color:var(--text);background:#1e180d;border:1px solid #6b5418;border-radius:8px;padding:8px 10px}
button{cursor:pointer;min-height:40px}button.primary{background:var(--gold);color:#140f04;border-color:var(--gold);font-weight:600}
#term{background:#000;border:1px solid var(--gold);border-radius:8px;height:55vh;overflow:auto;white-space:pre-wrap;word-break:break-all;font:13px/1.35 ui-monospace,Menlo,monospace;padding:8px;margin:0;user-select:text;-webkit-user-select:text;outline:none}
#term:focus{box-shadow:0 0 0 2px var(--gold2)}.keys{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.keys button{min-width:48px}
.row{display:flex;gap:6px}.row textarea{flex:1;min-height:42px;font-family:ui-monospace,Menlo,monospace}small,.muted{color:var(--muted)}
.hidden{display:none}code{color:var(--gold2)}
</style></head><body>
<header><h1>⬡ HONEYCOMB TERMINAL</h1><span id="status" class="pill">Checking…</span></header>
<p class="muted" id="mode">LIVE · your Mac's real shell over this local network (TLS). Not Demo. Basic text renderer: full-screen apps like vim/top display poorly.</p>
<section id="pair" class="panel hidden">
<h2 style="margin-top:0;color:var(--gold2);font-size:16px">Pair this device</h2>
<p class="muted">Enter the 8-character code shown in the Mac's Terminal window (valid 120 s, single use). Then type the approval on the Mac.</p>
<div class="row"><input id="code" placeholder="CODE" autocomplete="one-time-code" autocapitalize="characters" maxlength="9" style="flex:1"><input id="name" placeholder="Device name, e.g. iPad" maxlength="40" style="flex:1"></div>
<p><button class="primary" id="pairBtn">Request access</button></p><p id="pairMsg" class="muted" role="status"></p>
<p class="muted">Server certificate SHA-256 (compare with the Mac window):<br><code id="fp" style="word-break:break-all"></code></p>
</section>
<section id="app" class="hidden">
<pre id="term" tabindex="0" aria-label="Terminal output. Focus and type with an external keyboard."></pre>
<div class="keys" aria-label="Terminal keys">
<button data-k="\\u0003">Ctrl‑C</button><button data-k="\\t">Tab</button><button data-k="\\u001b">Esc</button>
<button data-k="\\u001b[A">↑</button><button data-k="\\u001b[B">↓</button><button data-k="\\u001b[D">←</button><button data-k="\\u001b[C">→</button>
<button data-k="\\u0004">Ctrl‑D</button><button data-k="\\u000c">Ctrl‑L</button>
</div>
<div class="row"><textarea id="line" placeholder="Type a command, then Send" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea><button class="primary" id="send">Send</button></div>
<div class="keys"><button id="copySel">Copy selection</button><button id="copyAll">Copy all</button><button id="paste">Paste</button><button id="test">Test Connection</button><button id="forget">Unpair this device</button></div>
<p id="testMsg" class="muted" role="status"></p>
</section>
<script src="/app.js"></script></body></html>"""

JS = r"""
const $=id=>document.getElementById(id);let ws=null,retry=0,stopped=false,buf='',dec=new TextDecoder();
const DANGER=/(^|[;&|]\s*)(sudo\b|rm\s+-[a-z]*[rf]|mkfs|dd\s+if=|shutdown|reboot|diskutil\s+erase|chmod\s+-R|chown\s+-R|>\s*\/dev\/|git\s+push\s+.*--force|killall)/i;
function status(t,c){const s=$('status');s.textContent=t;s.className='pill '+(c||'')}
function render(chunk){let s=chunk.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g,'').replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g,'').replace(/\x1b[()][0-9A-Za-z]|\x1b[=>78]/g,'').replace(/\x07/g,'').replace(/\r\n/g,'\n');
 for(const ch of s){if(ch==='\b'){buf=buf.slice(0,-1)}else if(ch==='\r'){buf=buf.slice(0,buf.lastIndexOf('\n')+1)}else buf+=ch}
 if(buf.length>200000)buf=buf.slice(-150000);const t=$('term');const atEnd=t.scrollTop+t.clientHeight>=t.scrollHeight-30;t.textContent=buf;if(atEnd)t.scrollTop=t.scrollHeight}
function send(d){if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'i',d}));else status('Not connected — input not sent','bad')}
function size(){const t=$('term');const cols=Math.max(20,Math.floor(t.clientWidth/7.8)),rows=Math.max(5,Math.floor(t.clientHeight/17.5));if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'r',rows,cols}))}
function connect(){if(stopped)return;if(!navigator.onLine){status('Offline — this device has no network','bad');return}
 status(retry?'Reconnecting…':'Connecting…');ws=new WebSocket('wss://'+location.host+'/ws');ws.binaryType='arraybuffer';
 ws.onopen=()=>{retry=0;status('Live · Mac shell','live');buf='';size()};
 ws.onmessage=e=>{if(typeof e.data==='string'){const m=JSON.parse(e.data);if(m.t==='exit')render('\n[shell exited — reconnect starts a new shell]\n');return}render(dec.decode(e.data,{stream:true}))};
 ws.onclose=e=>{if(e.code===4401){stopped=true;status('Revoked or expired — pair again','bad');setTimeout(()=>location.reload(),1500);return}
  retry++;const wait=Math.min(15000,1000*2**Math.min(retry,4));status('Mac unreachable (asleep, offline, different network or host stopped). Retrying…','bad');setTimeout(connect,wait)}}
async function init(){let st;try{st=await (await fetch('/api/state',{cache:'no-store'})).json()}catch{status('Mac unreachable','bad');return setTimeout(init,4000)}
 $('fp').textContent=st.fingerprint.match(/.{2}/g).join(':');if(!st.paired){$('pair').classList.remove('hidden');status('Not paired');return}
 $('app').classList.remove('hidden');connect()}
$('pairBtn').onclick=async()=>{$('pairMsg').textContent='Sending…';const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('code').value,name:$('name').value})});const j=await r.json();
 if(!r.ok){$('pairMsg').textContent={code_invalid:'Wrong code.',code_expired:'Code expired or used. On the Mac type: code',device_limit:'Too many devices; revoke one on the Mac.'}[j.error]||'Refused.';return}
 $('pairMsg').textContent='Waiting for approval on the Mac… type: approve '+j.id;const poll=async()=>{const s=await (await fetch('/api/pair/status?id='+j.id+'&secret='+encodeURIComponent(j.secret),{cache:'no-store'})).json();
 if(s.status==='approved')location.reload();else if(s.status==='denied'||s.status==='expired'||s.error)$('pairMsg').textContent='Not approved ('+(s.status||s.error)+').';else setTimeout(poll,1500)};poll()};
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>send(JSON.parse('"'+b.dataset.k+'"')));
function sendLine(text){const lines=text.split('\n');if(lines.some(l=>DANGER.test(l))&&!confirm('This looks destructive or privileged:\n\n'+text+'\n\nRun it on your Mac?'))return false;send(text.replace(/\n/g,'\r')+'\r');return true}
$('send').onclick=()=>{if(sendLine($('line').value))$('line').value=''};
$('line').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('send').click()}});
$('term').addEventListener('keydown',e=>{const map={Enter:'\r',Backspace:'\x7f',Tab:'\t',Escape:'\x1b',ArrowUp:'\x1b[A',ArrowDown:'\x1b[B',ArrowRight:'\x1b[C',ArrowLeft:'\x1b[D'};let d=null;
 if(e.metaKey)return;if(e.ctrlKey&&e.key.length===1)d=String.fromCharCode(e.key.toUpperCase().charCodeAt(0)-64);else if(map[e.key])d=map[e.key];else if(e.key.length===1)d=e.key;if(d!==null){e.preventDefault();send(d)}});
$('term').addEventListener('paste',e=>{e.preventDefault();const t=e.clipboardData.getData('text');if(t)sendLine(t)});
$('copySel').onclick=async()=>{const t=String(getSelection());if(!t){$('testMsg').textContent='Select text in the output first.';return}await navigator.clipboard.writeText(t);$('testMsg').textContent='Copied selection.'};
$('copyAll').onclick=async()=>{await navigator.clipboard.writeText(buf);$('testMsg').textContent='Copied output.'};
$('paste').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(t)sendLine(t)}catch{$('testMsg').textContent='Paste blocked by browser — long-press the output area and choose Paste.'}};
$('test').onclick=async()=>{$('testMsg').textContent='Running harmless echo on the Mac…';const r=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const j=await r.json();$('testMsg').textContent=r.ok?('Host '+j.host+' replied: '+j.output):'Failed: '+j.error};
$('forget').onclick=async()=>{if(!confirm('Unpair and end this device\'s shell?'))return;stopped=true;await fetch('/api/forget',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.reload()};
addEventListener('online',()=>{if(!ws||ws.readyState>1){retry=0;connect()}});addEventListener('offline',()=>status('Offline — this device has no network','bad'));addEventListener('resize',size);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(!ws||ws.readyState>1)&&!stopped){retry=0;connect()}});
init();
"""
