"""Private local-network live terminal (opt-in, reversible).

Serves HTTPS + WSS on ONE private/loopback interface address only. Access needs a
120-second single-use pairing code AND typed approval in the Mac console. Each
approved device gets an HttpOnly session cookie; revocation is checked on every
frame. Stdlib + system openssl only, compatible with macOS /usr/bin/python3 (3.9).
Never binds 0.0.0.0, public addresses, or relays through the internet.
"""
import base64
import hashlib
import hmac
import ipaddress
import json
import os
import secrets
import socket
import ssl
import struct
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from .pty_session import PtySession
from . import lan_page

CODE_TTL = 120
CODE_ATTEMPTS = 5
GLOBAL_FAILURES = 20
SESSION_TTL = 12 * 3600
DETACHED_TTL = 30 * 60
MAX_DEVICES = 5
SCROLLBACK = 128 * 1024
MAX_FRAME = 1 << 20
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


class LanDenied(Exception):
    pass


def check_bind(address):
    ip = ipaddress.ip_address(address)
    if ip.is_unspecified or ip.is_multicast or not (ip.is_private or ip.is_loopback) or ip.version != 4:
        raise LanDenied("bind_must_be_private_ipv4")
    return str(ip)


def detect_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("192.0.2.1", 9))  # UDP connect sends no packet
        return s.getsockname()[0]
    finally:
        s.close()


def _h(value):
    return hashlib.sha256(value.encode()).hexdigest()


def ensure_certificate(directory, ip):
    os.makedirs(directory, mode=0o700, exist_ok=True)
    cert, key = os.path.join(directory, "lan-cert.pem"), os.path.join(directory, "lan-key.pem")
    marker = os.path.join(directory, "lan-cert.ip")
    current = os.path.exists(cert) and os.path.exists(key) and os.path.exists(marker) and open(marker).read() == ip
    if not current:
        config = os.path.join(directory, "lan-openssl.cnf")
        with open(config, "w") as f:
            f.write("[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=Honeycomb LAN %s\n"
                    "[ext]\nsubjectAltName=IP:%s\nbasicConstraints=critical,CA:TRUE,pathlen:0\n"
                    "keyUsage=critical,digitalSignature,keyCertSign\nextendedKeyUsage=serverAuth\n" % (ip, ip))
        old = os.umask(0o077)
        try:
            subprocess.run(["openssl", "req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1",
                            "-nodes", "-days", "397", "-config", config, "-keyout", key, "-out", cert],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        finally:
            os.umask(old)
        with open(marker, "w") as f:
            f.write(ip)
    der = ssl.PEM_cert_to_DER_cert(open(cert).read())
    return cert, key, der, hashlib.sha256(der).hexdigest().upper()


class LiveSession:
    """One persistent PTY per device; survives socket disconnects for DETACHED_TTL."""

    def __init__(self, hub, device_id, argv, cwd):
        self.hub, self.device_id = hub, device_id
        self.pty = PtySession(argv, cwd)
        self.scrollback = bytearray()
        self.clients = set()
        self.lock = threading.Lock()
        self.detached_at = time.monotonic()
        self.ended = False
        threading.Thread(target=self._pump, daemon=True).start()

    def _pump(self):
        while not self.pty.closed:
            try:
                data = self.pty.read(.2)
            except OSError:
                data = b""
            if data:
                with self.lock:
                    self.scrollback += data
                    del self.scrollback[:-SCROLLBACK]
                    clients = list(self.clients)
                for c in clients:
                    c.send(data)
            try:
                if os.waitpid(self.pty.pid, os.WNOHANG)[0]:
                    break
            except ChildProcessError:
                break
        self.ended = True
        for c in list(self.clients):
            c.send(json.dumps({"t": "exit"}), text=True)
            c.close(4410)
        self.hub.drop_session(self.device_id, self)

    def attach(self, client):
        with self.lock:
            self.clients.add(client)
            history = bytes(self.scrollback)
        if history:
            client.send(history)

    def detach(self, client):
        with self.lock:
            self.clients.discard(client)
            if not self.clients:
                self.detached_at = time.monotonic()

    def close(self):
        for c in list(self.clients):
            c.close(4401)
        self.pty.close()


class Hub:
    def __init__(self, authority, shell_argv, cwd, audit_path=None, clock=time.time, on_event=print):
        self.authority, self.shell_argv, self.cwd = authority, shell_argv, cwd
        self.clock, self.audit_path, self.on_event = clock, audit_path, on_event
        self.lock = threading.RLock()
        self.code_hash, self.code_expiry, self.code_attempts = None, 0, 0
        self.failures = 0
        self.pending, self.devices, self.sessions = {}, {}, {}

    # ---- audit: fixed event codes + random ids only, never names/input/output/tokens
    def audit(self, event, device=""):
        if self.audit_path:
            with open(self.audit_path, "a") as f:
                f.write(json.dumps({"ts": int(self.clock()), "event": event, "device": device}) + "\n")

    def new_code(self):
        code = "".join(secrets.choice(ALPHABET) for _ in range(8))
        with self.lock:
            self.code_hash, self.code_expiry, self.code_attempts, self.failures = _h(code), self.clock() + CODE_TTL, 0, 0
        self.audit("pair_code_issued")
        return code

    def request_pair(self, code, name):
        name = "".join(ch for ch in str(name)[:40] if ch.isprintable()).strip() or "Unnamed device"
        with self.lock:
            if self.code_hash is None or self.clock() > self.code_expiry or self.failures >= GLOBAL_FAILURES:
                self.audit("pair_denied_no_code")
                raise LanDenied("code_expired")
            if not hmac.compare_digest(_h(str(code).strip().upper().replace("-", "")), self.code_hash):
                self.code_attempts += 1
                self.failures += 1
                if self.code_attempts >= CODE_ATTEMPTS:
                    self.code_hash = None
                self.audit("pair_denied_wrong_code")
                raise LanDenied("code_invalid")
            self.code_hash = None  # single use
            if len([d for d in self.devices.values() if not d["revoked"]]) >= MAX_DEVICES:
                raise LanDenied("device_limit")
            rid, secret = secrets.token_hex(4), secrets.token_urlsafe(24)
            self.pending[rid] = {"name": name, "secret": _h(secret), "status": "pending", "token": None, "at": self.clock()}
        self.audit("pair_requested", rid)
        self.on_event("\n[pairing] Device '%s' requests access. Type: approve %s   (or: deny %s)" % (name, rid, rid))
        return rid, secret

    def pair_status(self, rid, secret):
        with self.lock:
            p = self.pending.get(rid)
            if not p or not hmac.compare_digest(_h(secret), p["secret"]):
                raise LanDenied("unknown_request")
            if p["status"] == "pending" and self.clock() - p["at"] > 300:
                p["status"] = "expired"
            if p["status"] == "approved":
                token, p["token"], p["status"] = p["token"], None, "delivered"
                return "approved", token
            return p["status"], None

    def decide(self, rid, approve):
        with self.lock:
            p = self.pending.get(rid)
            if not p or p["status"] != "pending":
                raise LanDenied("no_pending_request")
            if not approve:
                p["status"] = "denied"
                self.audit("pair_denied_by_host", rid)
                return None
            token = secrets.token_urlsafe(32)
            self.devices[rid] = {"name": p["name"], "token": _h(token), "expires": self.clock() + SESSION_TTL, "revoked": False}
            p["status"], p["token"] = "approved", token
        self.audit("pair_approved_by_host", rid)
        return rid

    def device_for(self, token):
        if not token:
            return None
        th = _h(token)
        with self.lock:
            for did, d in self.devices.items():
                if hmac.compare_digest(d["token"], th):
                    if d["revoked"] or self.clock() > d["expires"]:
                        return None
                    return did
        return None

    def active(self, did):
        with self.lock:
            d = self.devices.get(did)
            return bool(d and not d["revoked"] and self.clock() <= d["expires"])

    def revoke(self, did):
        with self.lock:
            d = self.devices.get(did)
            if not d:
                raise LanDenied("unknown_device")
            d["revoked"] = True
            s = self.sessions.pop(did, None)
        if s:
            s.close()
        self.audit("device_revoked", did)

    def session_for(self, did):
        with self.lock:
            s = self.sessions.get(did)
            if s is None or s.ended:
                s = LiveSession(self, did, self.shell_argv, self.cwd)
                self.sessions[did] = s
                self.audit("shell_started", did)
            return s

    def drop_session(self, did, s):
        with self.lock:
            if self.sessions.get(did) is s:
                del self.sessions[did]
        self.audit("shell_ended", did)

    def reap(self):
        now = time.monotonic()
        with self.lock:
            stale = [(d, s) for d, s in self.sessions.items() if not s.clients and now - s.detached_at > DETACHED_TTL]
            expired = [d for d in self.sessions if not self.active(d)]
        for d, s in stale:
            s.close()
        for d in expired:
            s = self.sessions.get(d)
            if s:
                s.close()

    def shutdown(self):
        for s in list(self.sessions.values()):
            s.close()
        self.audit("host_stopped")


class WsClient:
    def __init__(self, sock):
        self.sock, self.wlock, self.closed = sock, threading.Lock(), False

    def send(self, payload, text=False):
        if isinstance(payload, str):
            payload = payload.encode()
        n = len(payload)
        head = bytes([0x81 if text else 0x82])
        head += bytes([n]) if n < 126 else (struct.pack("!BH", 126, n) if n < 65536 else struct.pack("!BQ", 127, n))
        self._raw(head + payload)

    def _raw(self, data):
        with self.wlock:
            if self.closed:
                return
            try:
                self.sock.sendall(data)
            except OSError:
                self.closed = True

    def close(self, code=1000):
        self._raw(bytes([0x88, 2]) + struct.pack("!H", code))
        with self.wlock:
            self.closed = True
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass

    def _exact(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError
            buf += chunk
        return buf

    def recv(self):
        b1, b2 = self._exact(2)
        op, n = b1 & 0x0F, b2 & 0x7F
        if not b2 & 0x80:
            raise ConnectionError("unmasked")
        if n == 126:
            n = struct.unpack("!H", self._exact(2))[0]
        elif n == 127:
            n = struct.unpack("!Q", self._exact(8))[0]
        if n > MAX_FRAME:
            raise ConnectionError("too_large")
        mask = self._exact(4)
        data = self._exact(n)
        if n:
            data = (int.from_bytes(data, "big") ^ int.from_bytes((mask * (n // 4 + 1))[:n], "big")).to_bytes(n, "big")
        if op == 0x9:
            self._raw(bytes([0x8A, len(data)]) + data[:125])
            return self.recv()
        if op == 0x8:
            raise ConnectionError("closed")
        return data


def make_handler(hub):
    origin = "https://" + hub.authority

    class Handler(BaseHTTPRequestHandler):
        server_version = "Honeycomb"
        sys_version = ""

        def log_message(self, *args):
            pass

        def _headers(self, status, ctype="application/json", extra=None):
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Strict-Transport-Security", "max-age=0")
            self.send_header("Content-Security-Policy", "default-src 'self'; connect-src 'self' wss://%s; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'" % hub.authority)
            for k, v in (extra or {}).items():
                self.send_header(k, v)

        def _json(self, status, body, extra=None):
            raw = json.dumps(body).encode()
            self._headers(status, extra=extra)
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def _host_ok(self):
            if self.headers.get("Host") != hub.authority:
                self._json(421, {"error": "wrong_host"})
                return False
            return True

        def _token(self):
            for part in (self.headers.get("Cookie") or "").split(";"):
                k, _, v = part.strip().partition("=")
                if k == "hc_lan":
                    return v
            return None

        def do_GET(self):
            if not self._host_ok():
                return
            url = urlparse(self.path)
            if url.path in ("/", "/index.html"):
                raw = lan_page.HTML.encode()
                self._headers(200, "text/html; charset=utf-8")
            elif url.path == "/app.js":
                raw = lan_page.JS.encode()
                self._headers(200, "text/javascript")
            elif url.path == "/manifest.webmanifest":
                raw = lan_page.MANIFEST.encode()
                self._headers(200, "application/manifest+json")
            elif url.path == "/icon.svg":
                raw = lan_page.ICON.encode()
                self._headers(200, "image/svg+xml")
            elif url.path == "/honeycomb-lan.cer":
                raw = self.server.cert_der
                self._headers(200, "application/x-x509-ca-cert", {"Content-Disposition": "attachment; filename=honeycomb-lan.cer"})
            elif url.path == "/api/state":
                did = hub.device_for(self._token())
                return self._json(200, {"paired": bool(did), "mode": "live-lan", "fingerprint": self.server.fingerprint})
            elif url.path == "/api/pair/status":
                q = parse_qs(url.query)
                try:
                    status, token = hub.pair_status(q.get("id", [""])[0], q.get("secret", [""])[0])
                except LanDenied as e:
                    return self._json(404, {"error": str(e)})
                extra = {"Set-Cookie": "hc_lan=%s; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=%d" % (token, SESSION_TTL)} if token else None
                return self._json(200, {"status": status}, extra)
            elif url.path == "/ws":
                return self._websocket()
            else:
                return self._json(404, {"error": "not_found"})
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_POST(self):
            if not self._host_ok():
                return
            length = int(self.headers.get("Content-Length") or 0)
            if length > 4096:
                self.close_connection = True
                return self._json(413, {"error": "too_large"})
            raw_body = self.rfile.read(length)
            if self.headers.get("Origin") != origin:
                return self._json(403, {"error": "origin_denied"})
            try:
                body = json.loads(raw_body or b"{}")
            except ValueError:
                return self._json(400, {"error": "bad_json"})
            path = urlparse(self.path).path
            if path == "/api/pair":
                try:
                    rid, secret = hub.request_pair(body.get("code", ""), body.get("name", ""))
                except LanDenied as e:
                    return self._json(403, {"error": str(e)})
                return self._json(200, {"id": rid, "secret": secret})
            did = hub.device_for(self._token())
            if not did:
                return self._json(401, {"error": "not_paired"})
            if path == "/api/test":
                out = subprocess.run(["/bin/echo", "Honeycomb connected"], capture_output=True, text=True, timeout=5).stdout.strip()
                hub.audit("test_connection", did)
                return self._json(200, {"output": out, "host": socket.gethostname()})
            if path == "/api/forget":
                hub.revoke(did)
                return self._json(200, {"ok": True}, {"Set-Cookie": "hc_lan=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0"})
            return self._json(404, {"error": "not_found"})

        def _websocket(self):
            key = self.headers.get("Sec-WebSocket-Key")
            if self.headers.get("Origin") != origin or not key or "websocket" not in (self.headers.get("Upgrade") or "").lower():
                return self._json(403, {"error": "origin_denied"})
            accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            self.send_header("Sec-WebSocket-Accept", accept)
            self.end_headers()
            self.wfile.flush()
            self.close_connection = True
            client = WsClient(self.connection)
            did = hub.device_for(self._token())
            if not did:
                client.close(4401)
                return
            session = hub.session_for(did)
            session.attach(client)
            hub.audit("socket_attached", did)
            try:
                while not client.closed:
                    msg = json.loads(client.recv() or b"{}")
                    if not hub.active(did):
                        client.close(4401)
                        break
                    if msg.get("t") == "i":
                        session.pty.write(str(msg.get("d", "")).encode())
                    elif msg.get("t") == "r":
                        session.pty.resize(int(msg.get("rows", 24)), int(msg.get("cols", 80)))
            except (ConnectionError, OSError, ValueError, TimeoutError):
                pass
            finally:
                session.detach(client)
                hub.audit("socket_detached", did)

    return Handler


def build_server(hub, bind, port, cert, key, der, fingerprint):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(cert, key)
    server = ThreadingHTTPServer((check_bind(bind), port), make_handler(hub))
    server.daemon_threads = True
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.cert_der, server.fingerprint = der, fingerprint
    return server
