"""Links this Mac to a Honeycomb account and checks account revocation.

Talks only to the Honeycomb backend over HTTPS with the public (publishable) key.
Authority = a one-use 10-minute code the signed-in owner created in the app; the
backend stores only hashes. The host secret stays in host.json (0600) on this Mac."""
import hashlib, json, os, re, secrets, ssl, urllib.error, urllib.request

BACKEND = "https://tkfrohljkrdivqgqxytk.supabase.co"
PUBLISHABLE_KEY = "sb_publishable_q7AMKYbv75zkxViLTpKT9Q_2WKIhs_o"
CODE_RE = re.compile(r"^[A-HJ-NP-Z2-9]{12}$")


class AccountError(Exception):
    pass


def _ctx():
    ctx = ssl.create_default_context()
    if not ctx.get_ca_certs():  # Apple's Python may lack a CA bundle; use the macOS system one
        for path in ("/etc/ssl/cert.pem", "/private/etc/ssl/cert.pem"):
            if os.path.exists(path):
                ctx.load_verify_locations(path)
                break
    return ctx


def _rpc(name, body, opener=None, timeout=10):
    req = urllib.request.Request(BACKEND + "/rest/v1/rpc/" + name, json.dumps(body).encode(),
                                 {"apikey": PUBLISHABLE_KEY, "Content-Type": "application/json"})
    try:
        with (opener or (lambda r: urllib.request.urlopen(r, timeout=timeout, context=_ctx())))(req) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("message", "")
        except Exception:
            msg = ""
        raise AccountError(msg or "http_%d" % e.code)
    except (urllib.error.URLError, OSError) as e:
        raise AccountError("offline")


def normalize_code(code):
    c = re.sub(r"[\s-]", "", str(code)).upper()
    if not CODE_RE.match(c):
        raise AccountError("code_format")
    return c


def host_file(state_dir):
    return os.path.join(state_dir, "host.json")


def load(state_dir):
    try:
        with open(host_file(state_dir)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def link(state_dir, code, name, os_name, fingerprint, rpc=_rpc):
    code = normalize_code(code)
    fingerprint = str(fingerprint).replace(":", "").lower()
    name = "".join(ch for ch in str(name)[:40] if ch.isprintable()).strip() or "My Mac"
    secret = secrets.token_hex(32)
    out = rpc("hc_enroll_host", {"p_code": code, "p_name": name, "p_os": os_name, "p_fingerprint": fingerprint,
                                 "p_secret_hash": hashlib.sha256(secret.encode()).hexdigest()})
    record = {"host_id": out["host_id"], "secret": secret, "name": name, "fingerprint": fingerprint}
    path = host_file(state_dir)
    fd = os.open(path + ".tmp", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(record, f)
    os.replace(path + ".tmp", path)
    return record


def status(record, rpc=_rpc):
    """'active' | 'revoked' | 'unknown' | 'offline'."""
    try:
        return rpc("hc_host_status", {"p_host": record["host_id"], "p_secret": record["secret"]}).get("state", "unknown")
    except AccountError as e:
        return "offline" if str(e) == "offline" else "unknown"


def unlink(state_dir):
    try:
        os.remove(host_file(state_dir))
    except OSError:
        pass
