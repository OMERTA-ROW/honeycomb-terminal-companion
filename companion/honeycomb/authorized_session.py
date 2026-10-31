"""In-process adapter for isolated acceptance only, not an internet endpoint.

The future transport must supply independently verified active-account evidence.
No browser flag or client-provided boolean is sufficient for deployment.
"""
from .pty_session import PtySession


class AuthorizedSession:
    def __init__(self, guard, scope, channel, verify_account, argv, cwd):
        self.guard, self.scope, self.channel = guard, scope, channel
        self.verify_account = verify_account
        guard.authorize(scope, 0, verify_account())
        self.sequence = 1
        self.pty = PtySession(argv, cwd)

    def authorize(self):
        try:
            self.guard.authorize(self.scope, self.sequence, self.verify_account())
            self.sequence += 1
        except Exception:
            self.pty.close()
            raise

    def input(self, sequence, ciphertext):
        self.authorize()
        try:
            self.pty.write(self.channel.open(sequence, ciphertext))
        except Exception:
            # Protocol violations fail closed; a rejected frame cannot leave a shell alive.
            self.guard.revoke(self.scope)
            self.pty.close()
            raise

    def output(self):
        self.authorize()
        return self.channel.seal(self.pty.read())

    def stop(self):
        self.guard.revoke(self.scope)
        self.pty.close()