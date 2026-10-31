"""Opt-in local console only. No sockets, HTTP server or remote mode."""
import argparse
import json
import os
import platform
import pwd
import select
import sys
import termios
import tty
import shutil

from .pty_session import PtySession
from .workspace import initialize, diagnostics, open_workspace, quarantine_duplicate, restore_export, WorkspaceDenied


def main():
    parser = argparse.ArgumentParser(description="Honeycomb local host acceptance core — NOT remote connectivity")
    parser.add_argument("command", choices=["doctor", "local-shell", "workspace-init", "workspace-open", "workspace-scan", "workspace-quarantine", "workspace-restore", "vscode-open"])
    parser.add_argument("--workspace", default="~/Desktop/Honeycomb Workspace")
    parser.add_argument("--selected", default="")
    parser.add_argument("--keeper", default="")
    parser.add_argument("--review-id", default="")
    args = parser.parse_args()
    if args.command == "doctor":
        print("Local PTY core: source available")
        print("Platform:", "macOS" if platform.system() == "Darwin" else "not macOS (sandbox checks only)")
        print("Account enrollment / relay / mobile shell: BLOCKED (not implemented)")
        print("Signed installer: NOT AVAILABLE")
        print("Network listeners: NONE")
        print("VS Code CLI:", "detected (not launched)" if shutil.which("code") else "unavailable; install code in PATH from VS Code")
        print("tmux:", "detected (not integrated)" if shutil.which("tmux") else "unavailable")
        print("Biometric authentication: NOT IMPLEMENTED; OS/provider authentication is separate")
        print("Storage scan: NOT RUN; explicit workspace-scan consent required")
        return 0
    if os.geteuid() == 0:
        print("Denied: run as your normal Mac user, never root.", file=sys.stderr)
        return 1
    if not sys.stdin.isatty() or not sys.stdout.isatty():
        print("Denied: local interactive console required.", file=sys.stderr)
        return 1
    if args.command != "local-shell":
        confirmations = {"workspace-init": "CREATE WORKSPACE", "workspace-open": "OPEN WORKSPACE",
                         "workspace-scan": "SCAN EXPORTS", "workspace-quarantine": "QUARANTINE COPY",
                         "workspace-restore": "RESTORE COPY", "vscode-open": "OPEN LOCAL VSCODE"}
        print("LOCAL ONLY — no account enrollment or remote authorization. Selected workspace:", args.workspace)
        print("Only selected workspace exports are scanned. Quarantine preserves bytes and frees no space.")
        if args.command == "workspace-quarantine":
            print("Selected copy:", args.selected, "| Preserve original:", args.keeper)
        phrase = confirmations[args.command]
        if input("Type " + phrase + " to consent: ") != phrase:
            return 1
        try:
            if args.command == "workspace-init":
                initialize(args.workspace, True)
                print("Workspace folders created. Nothing synced or paired.")
            elif args.command == "workspace-scan":
                print(json.dumps(diagnostics(args.workspace, True), indent=2))
            elif args.command == "workspace-quarantine":
                identifier = quarantine_duplicate(args.workspace, args.selected, args.keeper, True)
                print("Copy moved to review; recovered bytes: 0. Restore identifier:", identifier)
            elif args.command == "workspace-restore":
                restore_export(args.workspace, args.review_id, args.selected, True)
                print("Local copy restored; original unchanged.")
            else:
                open_workspace(args.workspace, args.command == "vscode-open", True, platform.system())
                print("Local open requested. Window success not independently verified; no remote connection.")
        except (WorkspaceDenied, OSError, subprocess.SubprocessError) as error:
            print("Local action refused:", str(error) if isinstance(error, WorkspaceDenied) else "OS operation failed; check permissions/tool availability", file=sys.stderr)
            return 1
        return 0
    print("LOCAL SHELL ONLY — not paired, not remotely connected. Commands affect this computer.")
    if input("Type ALLOW LOCAL SHELL to consent: ") != "ALLOW LOCAL SHELL":
        return 1
    shell = pwd.getpwuid(os.getuid()).pw_shell or "/bin/zsh"
    old = termios.tcgetattr(sys.stdin.fileno())
    session = None
    try:
        session = PtySession([shell, "-l"], os.path.expanduser("~"))
        dimensions = os.get_terminal_size()
        session.resize(dimensions.lines, dimensions.columns)
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
        if session is not None:
            session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())