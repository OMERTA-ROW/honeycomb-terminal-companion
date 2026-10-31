"""Opt-in local console only. No sockets, HTTP server or remote mode."""
import argparse
import os
import platform
import pwd
import select
import sys
import termios
import tty

from .pty_session import PtySession


def main():
    parser = argparse.ArgumentParser(description="Honeycomb local host acceptance core — NOT remote connectivity")
    parser.add_argument("command", choices=["doctor", "local-shell"])
    args = parser.parse_args()
    if args.command == "doctor":
        print("Local PTY core: source available")
        print("Platform:", "macOS" if platform.system() == "Darwin" else "not macOS (sandbox checks only)")
        print("Account enrollment / relay / mobile shell: BLOCKED (not implemented)")
        print("Signed installer: NOT AVAILABLE")
        print("Network listeners: NONE")
        return 0
    if os.geteuid() == 0:
        print("Denied: run as your normal Mac user, never root.", file=sys.stderr)
        return 1
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        print("Denied: local interactive console required.", file=sys.stderr)
        return 1
    print("LOCAL SHELL ONLY — not paired, not remotely connected. Commands affect this computer.")
    if input("Type ALLOW LOCAL SHELL to consent: ") != "ALLOW LOCAL SHELL":
        return 1
    shell = pwd.getpwuid(os.getuid()).pw_shell or "/bin/zsh"
    old = termios.tcgetattr(sys.stdin.fileno())
    session = PtySession([shell, "-l"], os.path.expanduser("~"))
    dimensions = os.get_terminal_size()
    session.resize(dimensions.lines, dimensions.columns)
    try:
        tty.setraw(sys.stdin.fileno())
        while True:
            inputs = select.select([sys.stdin.fileno(), session.fd], [], [], .1)[0]
            if sys.stdin.fileno() in inputs:
                data = os.read(sys.stdin.fileno(), 4096)
                if not data:
                    break
                session.write(data)
            if session.fd in inputs:
                output = session.read(0)
                if not output:
                    break
                os.write(sys.stdout.fileno(), output)
    finally:
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, old)
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())