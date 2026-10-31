"""QR payload, expiry, duplicate, invalid and served-page handling for lan-serve pairing."""
import os, tempfile, unittest
from honeycomb.qr import pairing_url, parse_pairing_url, render
from honeycomb.lan import Hub, LanDenied
from honeycomb import lan_page


class QrTests(unittest.TestCase):
    def test_payload_is_private_https_fragment(self):
        url = pairing_url("192.168.1.20:8765", "ABCD2345")
        self.assertEqual(url, "https://192.168.1.20:8765/#pair=ABCD2345")
        self.assertEqual(parse_pairing_url(url), ("192.168.1.20:8765", "ABCD2345"))

    def test_rejects_public_loopback_and_bad_codes(self):
        for auth in ("8.8.8.8:8765", "127.0.0.1:8765", "0.0.0.0:8765", "192.168.1.2:99999"):
            with self.assertRaises(ValueError): pairing_url(auth, "ABCD2345")
        for code in ("abcd2345", "ABCD234", "ABCD23450", "ABCD10OI"):
            with self.assertRaises(ValueError): pairing_url("10.0.0.2:8765", code)

    def test_parse_rejects_non_pairing_links(self):
        for bad in ("http://192.168.1.2:8765/#pair=ABCD2345", "https://evil.example/#pair=ABCD2345",
                    "https://192.168.1.2:8765/x#pair=ABCD2345", "https://192.168.1.2:8765/?pair=ABCD2345", "ABCD2345"):
            with self.assertRaises(ValueError): parse_pairing_url(bad)

    def test_render_is_a_real_qr_grid(self):
        lines = render(pairing_url("192.168.1.20:8765", "ABCD2345")).split("\n")
        self.assertGreater(len(lines), 12); self.assertEqual(len(set(map(len, lines))), 1)

    def _hub(self):
        self.now = 1000.0
        d = tempfile.mkdtemp()
        h = Hub("192.168.1.20:8765", ["/bin/sh"], d, os.path.join(d, "a.jsonl"), on_event=lambda *_: None)
        h.clock = lambda: self.now
        return h

    def test_qr_code_is_single_use(self):
        h = self._hub(); _, code = parse_pairing_url(pairing_url("192.168.1.20:8765", h.new_code()))
        h.request_pair(code, "iPhone")
        with self.assertRaises(LanDenied): h.request_pair(code, "iPhone again")

    def test_qr_code_expires(self):
        h = self._hub(); _, code = parse_pairing_url(pairing_url("192.168.1.20:8765", h.new_code()))
        self.now += 121
        with self.assertRaises(LanDenied): h.request_pair(code, "iPad")

    def test_new_qr_invalidates_previous(self):
        h = self._hub(); old = h.new_code(); h.new_code()
        with self.assertRaises(LanDenied): h.request_pair(old, "iPad")

    def test_phone_page_reads_and_strips_fragment(self):
        self.assertIn("#pair=([A-Z0-9]{8})", lan_page.JS)
        self.assertIn("history.replaceState", lan_page.JS)
        self.assertIn("Mac unreachable", lan_page.JS)
