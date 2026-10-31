"""Host-side, fail-closed protocol primitives; not a deployed relay protocol.

Keys and grants here are deliberately ephemeral. Production trust must be
durable, account-verified and revocation-checked before using this remotely.
"""
from dataclasses import dataclass
import hashlib
import hmac
import json
import secrets
import time

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


class Denied(Exception):
    """Fixed-code error; never includes payloads, credentials or key material."""


@dataclass(frozen=True)
class Scope:
    account: str
    host: str
    device: str
    session: str


class HostGuard:
    def __init__(self, account, host, clock=time.monotonic):
        self.account, self.host, self.clock = account, host, clock
        self.pairs, self.grants, self.last_sequence = {}, {}, {}
        self.audit = []
        self.stopped = False

    def record(self, event):
        # No commands, device names, email, output or token material.
        self.audit.append(event)
        self.audit = self.audit[-100:]

    def offer(self):
        token = secrets.token_urlsafe(32)
        digest = hashlib.sha256(token.encode()).digest()
        self.pairs[digest] = {"until": self.clock() + 120, "claimed": False, "scope": None, "attempts": 0}
        self.record("pair_offered")
        return token

    def claim(self, token, scope):
        digest = hashlib.sha256(token.encode()).digest()
        pair = self.pairs.get(digest)
        if not pair or pair["claimed"] or self.clock() >= pair["until"]:
            raise Denied("pair_invalid")
        pair["attempts"] += 1
        if pair["attempts"] > 5:
            pair["claimed"] = True
            raise Denied("pair_attempt_limit")
        if scope.account != self.account or scope.host != self.host:
            raise Denied("scope_denied")
        pair["claimed"] = True
        pair["scope"] = scope
        self.record("pair_requested")
        return digest

    def approve_on_host(self, digest, scope, consent):
        pair = self.pairs.get(digest)
        if self.stopped or not consent or not pair or pair["scope"] != scope or self.clock() >= pair["until"]:
            raise Denied("host_approval_required")
        # Approval handle is consumed too; it cannot re-enable a revoked grant.
        del self.pairs[digest]
        self.grants[scope] = True
        self.record("pair_approved")

    def authorize(self, scope, sequence, active_account):
        if self.stopped or not active_account or not self.grants.get(scope):
            raise Denied("access_denied")
        if type(sequence) is not int or sequence <= self.last_sequence.get(scope, -1):
            raise Denied("replay_denied")
        self.last_sequence[scope] = sequence

    def revoke(self, scope):
        self.grants.pop(scope, None)
        self.record("device_revoked")

    def stop(self):
        self.stopped = True
        self.grants.clear()
        self.pairs.clear()
        self.record("host_stopped")


def new_identity():
    return X25519PrivateKey.generate()


def public_identity(key):
    return key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)


def fingerprint(public_key):
    return hashlib.sha256(public_key).hexdigest()


class Channel:
    """Directional AEAD frames with scoped AAD and replay rejection.

    A caller MUST authenticate/pin the peer key through verified pairing first.
    X25519 alone is not authentication. Never use this as account verification.
    """
    def __init__(self, private_key, peer_public_key, expected_fingerprint, scope, role):
        from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PublicKey
        if role not in ("host", "device") or not hmac.compare_digest(fingerprint(peer_public_key), expected_fingerprint):
            raise Denied("peer_identity_denied")
        self.scope = json.dumps(scope.__dict__, sort_keys=True, separators=(",", ":")).encode()
        shared = private_key.exchange(X25519PublicKey.from_public_bytes(peer_public_key))
        material = HKDF(algorithm=hashes.SHA256(), length=64, salt=hashlib.sha256(self.scope).digest(), info=b"honeycomb-acceptance-v1").derive(shared)
        self.tx = AESGCM(material[:32] if role == "host" else material[32:])
        self.rx = AESGCM(material[32:] if role == "host" else material[:32])
        self.sent, self.received = 0, -1

    def seal(self, payload):
        if len(payload) > 65536 or self.sent >= 2**32:
            raise Denied("frame_limit")
        seq = self.sent
        nonce = seq.to_bytes(12, "big")
        result = self.tx.encrypt(nonce, payload, self.scope + nonce)
        self.sent += 1
        return seq, result

    def open(self, sequence, ciphertext):
        if type(sequence) is not int or sequence <= self.received or sequence >= 2**32 or len(ciphertext) > 65552:
            raise Denied("frame_invalid")
        nonce = sequence.to_bytes(12, "big")
        try:
            payload = self.rx.decrypt(nonce, ciphertext, self.scope + nonce)
        except Exception:
            raise Denied("frame_invalid") from None
        self.received = sequence
        return payload