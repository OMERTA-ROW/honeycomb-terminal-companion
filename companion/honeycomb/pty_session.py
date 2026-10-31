"""Real local Unix PTY. Never imported by the hosted web application."""
import errno
import fcntl
import os
import pty
import select
import signal
import struct
import termios
import time


class PtySession:
    def __init__(self, argv, cwd):
        if not argv or not os.path.isabs(argv[0]) or not os.path.isdir(cwd):
            raise ValueError("invalid_launch")
        self.pid, self.fd = pty.fork()
        self.closed = False
        if self.pid == 0:
            try:
                os.chdir(cwd)
                env = {k: v for k, v in os.environ.items() if k in ("HOME", "USER", "LOGNAME", "PATH", "LANG", "LC_ALL", "SHELL", "TMPDIR")}
                env["TERM"] = "xterm-256color"
                os.execve(argv[0], argv, env)
            except Exception:
                os._exit(127)
        os.set_blocking(self.fd, False)

    def resize(self, rows, columns):
        if not 1 <= rows <= 500 or not 1 <= columns <= 500:
            raise ValueError("invalid_dimensions")
        fcntl.ioctl(self.fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, columns, 0, 0))

    def write(self, data):
        if self.closed or len(data) > 65536:
            raise ValueError("input_denied")
        view = memoryview(data)
        deadline = time.monotonic() + 2
        while view:
            if time.monotonic() > deadline:
                raise TimeoutError("input_backpressure")
            if select.select([], [self.fd], [], .1)[1]:
                try:
                    n = os.write(self.fd, view)
                    view = view[n:]
                except BlockingIOError:
                    continue

    def read(self, timeout=.1):
        if self.closed or not select.select([self.fd], [], [], timeout)[0]:
            return b""
        try:
            return os.read(self.fd, 65536)
        except OSError as error:
            if error.errno == errno.EIO:
                return b""
            raise

    def close(self):
        if self.closed:
            return
        self.closed = True
        # Stop the complete foreground process group, not just the shell.
        try:
            os.killpg(os.tcgetpgrp(self.fd), signal.SIGTERM)
        except (ProcessLookupError, OSError):
            pass
        try:
            os.killpg(self.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        os.close(self.fd)
        deadline = time.monotonic() + 1
        while time.monotonic() < deadline:
            try:
                if os.waitpid(self.pid, os.WNOHANG)[0]:
                    return
            except ChildProcessError:
                return
            time.sleep(.02)
        try:
            os.killpg(self.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            os.waitpid(self.pid, 0)
        except ChildProcessError:
            pass