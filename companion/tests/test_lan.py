"""Real TLS + WebSocket + PTY over loopback. No accounts, email or internet."""
import base64, json, os, socket, ssl, struct, tempfile, threading, time, unittest, urllib.request, http.client
from honeycomb.lan import Hub, LanDenied, build_server, check_bind, ensure_certificate


def ws_frame(obj):
    data = json.dumps(obj).encode(); mask = os.urandom(4)
    head = bytes([0x81, 0x80 | len(data)]) if len(data) < 126 else bytes([0x81, 0xFE]) + struct.pack("!H", len(data))
    return head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data))


class LanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.cert, cls.key, der, fp = ensure_certificate(cls.dir, "127.0.0.1")
        cls.port = 18765
        cls.auth = "127.0.0.1:%d" % cls.port
        cls.hub = Hub(cls.auth, ["/bin/sh"], cls.dir, os.path.join(cls.dir, "audit.jsonl"), on_event=lambda *_: None)
        cls.server = build_server(cls.hub, "127.0.0.1", cls.port, cls.cert, cls.key, der, fp)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.ctx = ssl.create_default_context(cafile=cls.cert)  # pins our own cert; hostname = IP SAN

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.hub.shutdown()

    def req(self, method, path, body=None, cookie=None, origin=True):
        c = http.client.HTTPSConnection("127.0.0.1", self.port, context=self.ctx)
        h = {"Content-Type": "application/json"}
        if origin: h["Origin"] = "https://" + self.auth
        if cookie: h["Cookie"] = cookie
        c.request(method, path, json.dumps(body) if body is not None else None, h)
        r = c.getresponse(); return r.status, json.loads(r.read()), r.getheader("Set-Cookie")

    def pair(self, name="iPad"):
        code = self.hub.new_code()
        s, j, _ = self.req("POST", "/api/pair", {"code": code, "name": name})
        self.assertEqual(s, 200)
        s, st, ck = self.req("GET", "/api/pair/status?id=%s&secret=%s" % (j["id"], j["secret"]))
        self.assertEqual(st["status"], "pending"); self.assertIsNone(ck)
        self.hub.decide(j["id"], True)
        s, st, ck = self.req("GET", "/api/pair/status?id=%s&secret=%s" % (j["id"], j["secret"]))
        self.assertEqual(st["status"], "approved")
        self.assertIn("HttpOnly", ck); self.assertIn("Secure", ck); self.assertIn("SameSite=Strict", ck)
        # token is delivered exactly once
        self.assertEqual(self.req("GET", "/api/pair/status?id=%s&secret=%s" % (j["id"], j["secret"]))[1]["status"], "delivered")
        return j["id"], ck.split(";")[0]

    def ws(self, cookie):
        raw = socket.create_connection(("127.0.0.1", self.port))
        s = self.ctx.wrap_socket(raw, server_hostname="127.0.0.1")
        key = base64.b64encode(os.urandom(16)).decode()
        s.sendall(("GET /ws HTTP/1.1\r\nHost: %s\r\nOrigin: https://%s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\nCookie: %s\r\n\r\n" % (self.auth, self.auth, key, cookie)).encode())
        head = b""
        while b"\r\n\r\n" not in head: head += s.recv(1)
        self.assertIn(b"101", head.split(b"\r\n")[0]); s.settimeout(5); return s

    def read_until(self, s, needle, limit=5):
        out, end = b"", time.time() + limit
        while needle not in out and time.time() < end:
            try: out += s.recv(65536)
            except socket.timeout: break
        return out

    def test_bind_refuses_public_and_all_interfaces(self):
        for bad in ("0.0.0.0", "8.8.8.8", "::1"):
            with self.assertRaises((LanDenied, ValueError)): check_bind(bad)
        self.assertEqual(check_bind("192.168.1.20"), "192.168.1.20")

    def test_unpaired_cannot_get_shell_or_test(self):
        self.assertEqual(self.req("POST", "/api/test", {})[0], 401)
        s = self.ws("hc_lan=forged")
        self.assertIn(struct.pack("!H", 4401), self.read_until(s, struct.pack("!H", 4401)))

    def test_wrong_origin_and_host_denied(self):
        self.assertEqual(self.req("POST", "/api/pair", {"code": "x"}, origin=False)[0], 403)
        c = http.client.HTTPSConnection("127.0.0.1", self.port, context=self.ctx)
        c.request("GET", "/api/state", headers={"Host": "evil.example"}); self.assertEqual(c.getresponse().status, 421)

    def test_code_wrong_limit_single_use_expiry(self):
        code = self.hub.new_code()
        for _ in range(5):
            self.assertEqual(self.req("POST", "/api/pair", {"code": "WRONG000"})[0], 403)
        self.assertEqual(self.req("POST", "/api/pair", {"code": code})[1]["error"], "code_expired")
        code = self.hub.new_code(); self.req("POST", "/api/pair", {"code": code})
        self.assertEqual(self.req("POST", "/api/pair", {"code": code})[1]["error"], "code_expired")
        code = self.hub.new_code(); self.hub.code_expiry = time.time() - 1
        self.assertEqual(self.req("POST", "/api/pair", {"code": code})[1]["error"], "code_expired")

    def test_host_denial_gives_no_cookie(self):
        code = self.hub.new_code(); j = self.req("POST", "/api/pair", {"code": code, "name": "x"})[1]
        self.hub.decide(j["id"], False)
        s, st, ck = self.req("GET", "/api/pair/status?id=%s&secret=%s" % (j["id"], j["secret"]))
        self.assertEqual(st["status"], "denied"); self.assertIsNone(ck)

    def test_live_shell_io_reconnect_and_revoke(self):
        did, cookie = self.pair()
        st, body, _ = self.req("POST", "/api/test", {}, cookie)
        self.assertEqual(body["output"], "Honeycomb connected")
        s = self.ws(cookie)
        s.sendall(ws_frame({"t": "i", "d": "export HC=persist; printf 'Honeycomb %s\\n' connected\r"}))
        self.assertIn(b"Honeycomb connected", self.read_until(s, b"Honeycomb connected"))
        s.close()  # disconnect; shell must survive
        s2 = self.ws(cookie)
        s2.sendall(ws_frame({"t": "i", "d": "echo again-$HC\r"}))
        self.assertIn(b"again-persist", self.read_until(s2, b"again-persist"))
        self.hub.revoke(did)
        self.assertIn(struct.pack("!H", 4401), self.read_until(s2, struct.pack("!H", 4401)))
        self.assertEqual(self.req("POST", "/api/test", {}, cookie)[0], 401)
        s3 = self.ws(cookie)
        self.assertIn(struct.pack("!H", 4401), self.read_until(s3, struct.pack("!H", 4401)))

    def test_audit_has_no_secrets_or_names(self):
        self.pair("SecretNameXYZ")
        text = open(os.path.join(self.dir, "audit.jsonl")).read()
        self.assertNotIn("SecretNameXYZ", text); self.assertNotIn("hc_lan", text); self.assertIn("pair_approved_by_host", text)


if __name__ == "__main__":
    unittest.main()
