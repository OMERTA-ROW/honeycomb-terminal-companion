"""Real, scannable pairing QR for lan-serve (vendored MIT qrcodegen, no network).

The QR holds only https://<private-ip>:<port>/#pair=<CODE>. The code lives in the
URL fragment, which browsers never send to any server, and is still single-use,
120 s and requires Mac console approval. It is not an access grant by itself."""
import ipaddress
from urllib.parse import urlparse
from .qrcodegen import QrCode

ALPHABET = set("ABCDEFGHJKMNPQRSTUVWXYZ23456789")


def pairing_url(authority, code):
    host, _, port = authority.rpartition(":")
    ip = ipaddress.IPv4Address(host)
    if not ip.is_private or ip.is_loopback or ip.is_unspecified:
        raise ValueError("not a private LAN address")
    if not (port.isdigit() and 0 < int(port) < 65536) or len(code) != 8 or not set(code) <= ALPHABET:
        raise ValueError("bad port or code")
    return "https://%s:%s/#pair=%s" % (host, port, code)


def parse_pairing_url(url):
    """Returns (authority, code) or raises ValueError; mirrors the phone page check."""
    u = urlparse(url)
    if u.scheme != "https" or u.path not in ("", "/") or u.query or not u.fragment.startswith("pair="):
        raise ValueError("not a Honeycomb pairing link")
    code = u.fragment[5:]
    authority = u.netloc
    pairing_url(authority, code)  # re-validate
    return authority, code


def render(text):
    """Terminal QR using half-block characters, dark modules on a light quiet zone."""
    qr = QrCode.encode_text(text, QrCode.Ecc.MEDIUM)
    n, b = qr.get_size(), 2
    def dark(x, y):
        return 0 <= x < n and 0 <= y < n and qr.get_module(x, y)
    rows = []
    for y in range(-b, n + b, 2):
        line = ""
        for x in range(-b, n + b):
            top, bot = dark(x, y), dark(x, y + 1)
            # light background = printed block; dark module = space (works on black terminals)
            line += " " if top and bot else ("\u2584" if top else ("\u2580" if bot else "\u2588"))
        rows.append(line)
    return "\n".join(rows)
