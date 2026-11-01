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
<p class="muted" id="mode">Mac shell · encrypted private network. Connection is verified below, not by this label. Basic text renderer: full-screen apps like vim/top display poorly.</p>
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
<section id="files" class="panel hidden" aria-labelledby="files-h">
<h2 id="files-h" style="margin-top:0;color:var(--gold2);font-size:16px">Paste / Add File → save on Mac</h2>
<p class="muted">Saves into <code>~/Honeycomb/Inbox</code> on your Mac. Nothing is run — this is separate from the terminal. Max 25 MB. To add a project folder (e.g. OMNI, Evolution), create it inside the Inbox on the Mac; only those folders appear here.</p>
<div id="drop" style="border:1px dashed var(--gold);border-radius:8px;padding:12px;text-align:center"><label>Choose a file <input type="file" id="pick"></label><br><small>or drag a file here (desktop/iPad with drag support)</small></div>
<p><textarea id="ptext" placeholder="…or paste text/commands here to save as a .txt file (not run)" style="width:100%;min-height:70px"></textarea></p>
<div class="row"><select id="dest" aria-label="Destination folder" style="flex:1;font:inherit;color:var(--text);background:#1e180d;border:1px solid #6b5418;border-radius:8px;padding:8px"></select><input id="fname" placeholder="file name" maxlength="120" style="flex:1"></div>
<p id="review" class="muted" role="status">Nothing selected.</p>
<progress id="prog" max="100" value="0" class="hidden" style="width:100%;accent-color:var(--gold)"></progress>
<p><button class="primary" id="save" disabled>Save to Mac</button> <button id="clearF">Clear</button></p>
<p id="fileMsg" class="muted" role="status"></p>
<small>iPhone/iPad: the clipboard pastes text only. For photos or documents use “Choose a file” (Files/Photos).</small>
</section>
<script src="/app.js"></script></body></html>"""

JS = r"""
const $=id=>document.getElementById(id);let ws=null,retry=0,stopped=false,paired=false,buf='',dec=new TextDecoder(),retryTimer=null,beatTimer=null,lastPong=0,pairBusy=false,pollTimer=null,pollFailures=0;
async function request(path,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(path,{...options,cache:'no-store',signal:controller.signal});let j;try{j=await r.json()}catch{throw new Error('The Mac returned an unreadable response. Retry; check the Honeycomb window.')}if(!r.ok)throw new Error(j.error||'Request refused ('+r.status+').');return j}finally{clearTimeout(timer)}}
function clearRetry(){clearTimeout(retryTimer);retryTimer=null}
function scheduleRetry(){clearRetry();if(stopped||!paired)return;retry++;status('Mac not responding — sleep, network, certificate or helper may be unavailable. Retrying…','bad');retryTimer=setTimeout(()=>{retryTimer=null;connect()},Math.min(15000,1000*2**Math.min(retry,4)))}
const DANGER=/(^|[;&|]\s*)(sudo\b|rm\s+-[a-z]*[rf]|mkfs|dd\s+if=|shutdown|reboot|diskutil\s+erase|chmod\s+-R|chown\s+-R|>\s*\/dev\/|git\s+push\s+.*--force|killall)/i;
function status(t,c){const s=$('status');s.textContent=t;s.className='pill '+(c||'')}
function render(chunk){let s=chunk.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g,'').replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g,'').replace(/\x1b[()][0-9A-Za-z]|\x1b[=>78]/g,'').replace(/\x07/g,'').replace(/\r\n/g,'\n');
 for(const ch of s){if(ch==='\b'){buf=buf.slice(0,-1)}else if(ch==='\r'){buf=buf.slice(0,buf.lastIndexOf('\n')+1)}else buf+=ch}
 if(buf.length>200000)buf=buf.slice(-150000);const t=$('term');const atEnd=t.scrollTop+t.clientHeight>=t.scrollHeight-30;t.textContent=buf;if(atEnd)t.scrollTop=t.scrollHeight}
function send(d){if(ws&&ws.readyState===1&&lastPong){ws.send(JSON.stringify({t:'i',d}));return true}status('Not connected — input not sent','bad');return false}
function size(){const t=$('term');const cols=Math.max(20,Math.floor(t.clientWidth/7.8)),rows=Math.max(5,Math.floor(t.clientHeight/17.5));if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'r',rows,cols}))}
function connect(){clearRetry();if(stopped||!paired||ws&&ws.readyState<2)return;if(!navigator.onLine){status('Offline — no network','bad');return}
 status(retry?'Searching for your Mac…':'Searching…');let socket;try{socket=new WebSocket('wss://'+location.host+'/ws')}catch{scheduleRetry();return}ws=socket;socket.binaryType='arraybuffer';lastPong=0;
 const watchdog=setTimeout(()=>{if(ws===socket&&!lastPong){socket.close();scheduleRetry()}},10000);
 socket.onopen=()=>{if(ws!==socket)return;buf='';dec=new TextDecoder();size();socket.send(JSON.stringify({t:'ping'}))};
 socket.onmessage=e=>{if(ws!==socket)return;if(typeof e.data==='string'){let m;try{m=JSON.parse(e.data)}catch{status('Invalid Mac response','bad');socket.close();return}if(m.t==='ready'||m.t==='pong'){lastPong=Date.now();retry=0;clearTimeout(watchdog);status('Connected · live Mac shell','live');if(!beatTimer)beatTimer=setInterval(()=>{if(ws!==socket)return;if(Date.now()-lastPong>35000){status('Connection check timed out — reconnecting','bad');socket.close();return}if(socket.readyState===1)socket.send(JSON.stringify({t:'ping'}))},10000)}if(m.t==='exit')render('\n[shell exited — reconnect starts a new shell]\n');return}render(dec.decode(e.data,{stream:true}))};
 socket.onerror=()=>{if(ws===socket)status('Connection failed — check the Mac, private network and certificate','bad')};
 socket.onclose=e=>{clearTimeout(watchdog);if(ws!==socket)return;ws=null;lastPong=0;clearInterval(beatTimer);beatTimer=null;if(e.code===4401){stopped=true;paired=false;clearRetry();$('app').classList.add('hidden');$('files').classList.add('hidden');$('pair').classList.remove('hidden');status('Permission needed — revoked or expired; pair again','bad');return}scheduleRetry()}}
async function init(){let st;try{st=await request('/api/state')}catch(e){status(e.message,'bad');clearRetry();retryTimer=setTimeout(init,4000);return}
 $('fp').textContent=(st.fingerprint.match(/.{2}/g)||[]).join(':');paired=st.paired;if(st.locked){stopped=true;status('Mac revoked from its account — access blocked','bad');return}if(!paired){$('pair').classList.remove('hidden');status('Pairing · approval needed');return}
 stopped=false;$('pair').classList.add('hidden');$('app').classList.remove('hidden');$('files').classList.remove('hidden');loadDest();connect()}
(()=>{const m=/^#pair=([A-Z0-9]{8})$/.exec(location.hash);if(m){$('code').value=m[1];history.replaceState(null,'',location.pathname);$('pairMsg').textContent='Code filled in from the QR. Check the certificate fingerprint below matches the Mac, add a device name, then tap Request access.'}else if(location.hash){history.replaceState(null,'',location.pathname);$('pairMsg').textContent='That link is not a valid Honeycomb pairing QR. On the Mac type: code'}})();
function finishPair(message){pairBusy=false;clearTimeout(pollTimer);$('pairBtn').disabled=false;$('pairMsg').textContent=message}
$('pairBtn').onclick=async()=>{if(pairBusy)return;pairBusy=true;$('pairBtn').disabled=true;$('pairMsg').textContent='Sending request — this does not generate a code. Use the 8-character code from the Mac.';let j;try{j=await request('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('code').value,name:$('name').value})})}catch(e){finishPair(({code_invalid:'Wrong code. Use the 8-character Mac code, not the 12-character account link code.',code_expired:'Code expired, used, or replaced. On the Mac type: code. Scan the new QR.',device_limit:'Too many devices; revoke one on the Mac.',host_revoked:'Mac revoked from its account.'})[e.message]||'Request failed: '+e.message+' Check the Mac and your private network; retry with a new Mac code if the request may have reached it.');return}
 pollFailures=0;const deadline=Date.now()+300000;const poll=async()=>{try{const s=await request('/api/pair/status?id='+encodeURIComponent(j.id)+'&secret='+encodeURIComponent(j.secret));pollFailures=0;if(s.status==='approved'){finishPair('Approved. Checking your Mac connection…');await init();return}if(s.status==='delivered'){const state=await request('/api/state');if(state.paired){finishPair('Approved.');await init();return}finishPair('Approval response was lost. On the Mac revoke this request, type code, and pair again.');return}if(s.status==='denied'||s.status==='expired'){finishPair('Not approved ('+s.status+'). On the Mac type code to retry.');return}$('pairMsg').textContent='Waiting for approval on the Mac… type: approve '+j.id}catch(e){pollFailures++;if(e.message==='unknown_request'){finishPair('Request no longer exists; the helper may have restarted. On the Mac type code.');return}$('pairMsg').textContent='Approval check interrupted. Retrying the same request… '+e.message}if(Date.now()>=deadline){finishPair('Approval timed out. On the Mac type code and try again.');return}pollTimer=setTimeout(poll,Math.min(10000,1500*2**Math.min(pollFailures,3)))};void poll()};
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>send(JSON.parse('"'+b.dataset.k+'"')));
function sendLine(text){const lines=text.split('\n');if(lines.some(l=>DANGER.test(l))&&!confirm('This looks destructive or privileged:\n\n'+text+'\n\nRun it on your Mac?'))return false;return send(text.replace(/\r\n?/g,'\n').replace(/\n/g,'\r')+'\r')}
$('send').onclick=()=>{if(sendLine($('line').value))$('line').value=''};
$('line').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('send').click()}});
$('term').addEventListener('keydown',e=>{const map={Enter:'\r',Backspace:'\x7f',Tab:'\t',Escape:'\x1b',ArrowUp:'\x1b[A',ArrowDown:'\x1b[B',ArrowRight:'\x1b[C',ArrowLeft:'\x1b[D'};let d=null;
 if(e.metaKey)return;if(e.ctrlKey&&e.key.length===1)d=String.fromCharCode(e.key.toUpperCase().charCodeAt(0)-64);else if(map[e.key])d=map[e.key];else if(e.key.length===1)d=e.key;if(d!==null){e.preventDefault();send(d)}});
function pasteDraft(t){const line=$('line');line.setRangeText(t.replace(/\r\n?/g,'\n'),line.selectionStart,line.selectionEnd,'end');line.focus();$('testMsg').textContent='Pasted into command draft — review, then Send.'}
$('term').addEventListener('paste',e=>{e.preventDefault();const t=e.clipboardData.getData('text');if(t)pasteDraft(t)});
async function copyText(t){try{await navigator.clipboard.writeText(t);$('testMsg').textContent='Copied.'}catch{$('testMsg').textContent='Copy blocked. Select output and use the native Copy menu.'}}
$('copySel').onclick=()=>{const t=String(getSelection());if(!t){$('testMsg').textContent='Select text in the output first.';return}void copyText(t)};
$('copyAll').onclick=()=>void copyText(buf);
$('paste').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(t)pasteDraft(t);else $('testMsg').textContent='Clipboard is empty.'}catch{$('line').focus();$('testMsg').textContent='Paste blocked by browser — long-press the command field and choose Paste.'}};
$('test').onclick=async()=>{$('testMsg').textContent='Running harmless echo on the Mac…';try{const j=await request('/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});$('testMsg').textContent='Host '+j.host+' replied: '+j.output}catch(e){$('testMsg').textContent='Test failed: '+e.message}};
$('forget').onclick=async()=>{if(!confirm('Unpair and end this device\'s shell?'))return;try{await request('/api/forget',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});stopped=true;clearRetry();if(ws)ws.close();location.reload()}catch(e){$('testMsg').textContent='Unpair not confirmed: '+e.message+'. Revoke on the Mac if this device is offline.'}};
addEventListener('online',()=>{retry=0;if(paired)connect();else if(!pairBusy)void init()});addEventListener('offline',()=>{clearRetry();status('Offline — no network','bad');if(ws)ws.close()});addEventListener('resize',size);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!stopped){if(ws&&ws.readyState===1){if(Date.now()-lastPong>35000){status('Checking resumed connection…');ws.close()}else ws.send(JSON.stringify({t:'ping'}))}else if(paired){retry=0;connect()}else if(!pairBusy)void init()}});
init();

let pending=null,MAX=25*1024*1024;
async function loadDest(){try{const j=await request('/api/files/destinations');MAX=j.max||MAX;$('dest').innerHTML='';(j.destinations||[]).forEach(d=>{const o=document.createElement('option');o.value=o.textContent=d;$('dest').appendChild(o)});review()}catch(e){$('fileMsg').textContent='Could not load folders: '+e.message}}
function fmt(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB'}
function review(){const t=$('ptext').value;if($('pick').files[0])pending=$('pick').files[0];else if(t)pending=new Blob([t],{type:'text/plain'});else pending=null;
 if(!pending){$('review').textContent='Nothing selected.';$('save').disabled=true;return}
 if(!$('fname').value)$('fname').value=pending.name||'pasted.txt';
 const big=pending.size>MAX;$('review').textContent=(big?'Too large: ':'Review: ')+'“'+$('fname').value+'” ('+fmt(pending.size)+') → '+($('dest').value||'?')+'. Saved only, never run.';$('save').disabled=big||!$('dest').value}
['input','change'].forEach(ev=>{$('ptext').addEventListener(ev,review);$('pick').addEventListener(ev,()=>{$('fname').value='';review()});$('fname').addEventListener(ev,review);$('dest').addEventListener(ev,review)});
$('drop').addEventListener('dragover',e=>e.preventDefault());
$('drop').addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);$('pick').files=dt.files;$('fname').value='';review()}});
$('clearF').onclick=()=>{$('pick').value='';$('ptext').value='';$('fname').value='';$('fileMsg').textContent='';review()};
$('save').onclick=()=>{if(!pending)return;if(!navigator.onLine){$('fileMsg').textContent='Offline — not sent.';return}
 const x=new XMLHttpRequest();x.open('POST','/api/files?dest='+encodeURIComponent($('dest').value)+'&name='+encodeURIComponent($('fname').value));x.timeout=120000;x.ontimeout=()=>{$('save').disabled=false;$('fileMsg').textContent='Save timed out; outcome unknown. Check the Inbox on the Mac before retrying.'};
 $('prog').classList.remove('hidden');$('prog').value=0;$('save').disabled=true;x.upload.onprogress=e=>{if(e.lengthComputable)$('prog').value=100*e.loaded/e.total};
 x.onload=()=>{let j={};try{j=JSON.parse(x.responseText)}catch{}$('save').disabled=false;
  if(x.status===200){$('prog').value=100;$('fileMsg').textContent='Saved on Mac as “'+j.saved+'” in '+$('dest').value+' ('+fmt(j.bytes)+').'}
  else if(x.status===401){$('fileMsg').textContent='Not paired or revoked — pair again.'}
  else $('fileMsg').textContent='Not saved: '+({too_large:'file over 25 MB',destination_not_allowed:'folder not allowed on the Mac',bad_name:'invalid file name',origin_denied:'blocked'}[j.error]||'error '+x.status)};
 x.onerror=()=>{$('save').disabled=false;$('fileMsg').textContent='Not saved — Mac unreachable. Check Wi-Fi and that Honeycomb is running.'};x.send(pending)};
"""
