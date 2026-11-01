"""Exercise the shipped mobile JS with deterministic network/socket races."""
import pathlib
import subprocess
import unittest
from honeycomb.lan_page import JS


class LanBrowserTests(unittest.TestCase):
    def test_mobile_request_poll_reconnect_and_heartbeat(self):
        script = pathlib.Path(__file__).with_name('lan_browser_checks.cjs')
        result = subprocess.run(['node', str(script)], input=JS, text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)