"""Account link: code format, secret handling, revocation lock. Backend calls are faked here;
the real-backend run is recorded in docs/OPERATIONAL_LOG.md."""
import json, os, tempfile, unittest
from honeycomb import account
from honeycomb.lan import Hub, LanDenied


class AccountTests(unittest.TestCase):
    def test_code_format(self):
        self.assertEqual(account.normalize_code("abcd-efgh-jk23"), "ABCDEFGHJK23")
        for bad in ("short", "ABCDEFGHJK2O", "ABCDEFGHJK231"):
            with self.assertRaises(account.AccountError): account.normalize_code(bad)

    def test_link_sends_only_hash_and_stores_secret_0600(self):
        sent = {}
        def rpc(name, body): sent.update(body); return {"host_id": "h1"}
        d = tempfile.mkdtemp(); rec = account.link(d, "ABCDEFGHJK23", "Mac", "macos", "a" * 64, rpc=rpc)
        self.assertNotIn(rec["secret"], json.dumps(sent)); self.assertEqual(len(sent["p_secret_hash"]), 64)
        self.assertEqual(os.stat(account.host_file(d)).st_mode & 0o777, 0o600)
        self.assertEqual(account.load(d)["host_id"], "h1")

    def test_status_maps_offline(self):
        def rpc(*a): raise account.AccountError("offline")
        self.assertEqual(account.status({"host_id": "h", "secret": "s"}, rpc=rpc), "offline")

    def test_revoked_host_locks_pairing_and_devices(self):
        d = tempfile.mkdtemp(); h = Hub("192.168.1.2:8765", ["/bin/sh"], d, None, on_event=lambda *_: None)
        code = h.new_code(); p = h.request_pair(code, "iPad"); h.decide(p["id"], True)
        h.lock_host()
        self.assertTrue(all(v["revoked"] for v in h.devices.values()))
        with self.assertRaises(LanDenied): h.new_code()
        with self.assertRaises(LanDenied): h.request_pair("ABCDEFGH", "x")
