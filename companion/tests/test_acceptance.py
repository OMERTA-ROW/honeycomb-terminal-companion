"""Isolated local fixtures only; no auth accounts, email or network traffic."""
import os
from pathlib import Path
import tempfile
import time
import unittest

from honeycomb.pty_session import PtySession
from honeycomb.security import Channel, Denied, HostGuard, Scope, fingerprint, new_identity, public_identity


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.now = 0
        self.guard = HostGuard("account-a", "host-a", lambda: self.now)
        self.scope = Scope("account-a", "host-a", "device-a", "session-a")

    def approve(self):
        token = self.guard.offer()
        handle = self.guard.claim(token, self.scope)
        self.guard.approve_on_host(handle, self.scope, True)
        return token, handle

    def test_requires_host_approval(self):
        self.guard.claim(self.guard.offer(), self.scope)
        with self.assertRaises(Denied):
            self.guard.authorize(self.scope, 0, True)

    def test_expiry_is_120_seconds(self):
        token = self.guard.offer()
        self.now = 120
        with self.assertRaises(Denied):
            self.guard.claim(token, self.scope)

    def test_single_use(self):
        token, _ = self.approve()
        with self.assertRaises(Denied):
            self.guard.claim(token, self.scope)

    def test_cross_account_and_host_denied(self):
        for account, host in [("account-b", "host-a"), ("account-a", "host-b")]:
            with self.assertRaises(Denied):
                self.guard.claim(self.guard.offer(), Scope(account, host, "device-a", "session-a"))

    def test_five_attempt_limit(self):
        token = self.guard.offer()
        wrong = Scope("wrong", "host-a", "device-a", "session-a")
        for _ in range(5):
            with self.assertRaises(Denied):
                self.guard.claim(token, wrong)
        with self.assertRaisesRegex(Denied, "pair_attempt_limit"):
            self.guard.claim(token, self.scope)

    def test_revocation_denies_reconnect_and_old_approval(self):
        _, handle = self.approve()
        self.guard.authorize(self.scope, 0, True)
        self.guard.revoke(self.scope)
        with self.assertRaises(Denied):
            self.guard.authorize(self.scope, 1, True)
        with self.assertRaises(Denied):
            self.guard.approve_on_host(handle, self.scope, True)

    def test_revoked_account_and_stop_denied(self):
        self.approve()
        with self.assertRaises(Denied):
            self.guard.authorize(self.scope, 0, False)
        self.guard.stop()
        with self.assertRaises(Denied):
            self.guard.authorize(self.scope, 1, True)

    def test_session_scope_and_replay(self):
        self.approve()
        self.guard.authorize(self.scope, 0, True)
        with self.assertRaises(Denied):
            self.guard.authorize(self.scope, 0, True)
        with self.assertRaises(Denied):
            self.guard.authorize(Scope("account-a", "host-a", "device-a", "other-session"), 1, True)

    def test_audit_excludes_token_and_payload(self):
        token, _ = self.approve()
        self.guard.revoke(self.scope)
        self.assertEqual(self.guard.audit, ["pair_offered", "pair_requested", "pair_approved", "device_revoked"])
        self.assertNotIn(token, repr(self.guard.audit))


class EncryptionTests(unittest.TestCase):
    def setUp(self):
        a, b = new_identity(), new_identity()
        self.scope = Scope("account-a", "host-a", "device-a", "session-a")
        self.a = Channel(a, public_identity(b), fingerprint(public_identity(b)), self.scope, "host")
        self.b = Channel(b, public_identity(a), fingerprint(public_identity(a)), self.scope, "device")
        self.identities = a, b

    def test_bidirectional_encrypted_roundtrip(self):
        seq, frame = self.a.seal(b"Honeycomb connected")
        self.assertNotIn(b"Honeycomb connected", frame)
        self.assertEqual(self.b.open(seq, frame), b"Honeycomb connected")
        self.assertEqual(self.a.open(*self.b.seal(b"reply")), b"reply")

    def test_tamper_and_replay_denied(self):
        seq, frame = self.a.seal(b"input")
        with self.assertRaises(Denied):
            self.b.open(seq, frame[:-1] + bytes([frame[-1] ^ 1]))
        self.b.open(seq, frame)
        with self.assertRaises(Denied):
            self.b.open(seq, frame)

    def test_peer_mismatch_denied(self):
        a, b = self.identities
        with self.assertRaises(Denied):
            Channel(a, public_identity(b), "0" * 64, self.scope, "host")

    def test_other_session_cannot_decrypt(self):
        a, b = self.identities
        other = Channel(b, public_identity(a), fingerprint(public_identity(a)), Scope("account-a", "host-a", "device-a", "other"), "device")
        with self.assertRaises(Denied):
            other.open(*self.a.seal(b"secret output"))


class LocalPtyTests(unittest.TestCase):
    def test_real_shell_harmless_command_and_directory(self):
        with tempfile.TemporaryDirectory(prefix="hc-acceptance-") as directory:
            session = PtySession(["/bin/sh"], directory)
            try:
                session.resize(24, 80)
                # Echo is on; split the marker so echoed input cannot pass.
                session.write(b"printf 'Honeycomb %s\\n' connected; pwd\n")
                output = b""
                deadline = time.monotonic() + 3
                while time.monotonic() < deadline:
                    output += session.read(.1)
                    if b"Honeycomb connected\r\n" in output and os.fsencode(directory) + b"\r\n" in output:
                        break
                self.assertIn(b"Honeycomb connected\r\n", output)
                self.assertIn(os.fsencode(directory) + b"\r\n", output)
            finally:
                session.close()
            with self.assertRaises(ProcessLookupError):
                os.kill(session.pid, 0)

    def test_input_after_stop_denied(self):
        with tempfile.TemporaryDirectory() as directory:
            session = PtySession(["/bin/sh"], directory)
            session.close()
            with self.assertRaises(ValueError):
                session.write(b"echo forbidden\n")

    def test_resize_bounds(self):
        with tempfile.TemporaryDirectory() as directory:
            session = PtySession(["/bin/sh"], directory)
            try:
                with self.assertRaises(ValueError):
                    session.resize(0, 80)
            finally:
                session.close()


if __name__ == "__main__":
    unittest.main()