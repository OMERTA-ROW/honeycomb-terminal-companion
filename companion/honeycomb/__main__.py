"""Opt-in console. Only lan-serve opens a listener (private LAN/loopback, TLS, pairing + host approval)."""
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
import subprocess

from .pty_session import PtySession
from .workspace import initialize, diagnostics, open_workspace, quarantine_duplicate, restore_export, WorkspaceDenied


def main():
    parser = argparse.ArgumentParser(description="Honeycomb local host acceptance core — NOT remote connectivity")
    parser.add_argument("command", choices=["doctor", "local-shell", "workspace-init", "workspace-open", "workspace-scan", "workspace-quarantine", "workspace-restore", "vscode-open", "lan-serve"])
    parser.add_argument("--bind", default="")
    parser.add_argument("--port", type=int, default=8765)
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
        print("Network listeners: NONE unless you run lan-serve (private local network, TLS, pairing code + Mac approval)")
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
    if args.command == "lan-serve":
        return lan_serve(args)
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


def lan_serve(args):
    import threading
    import time
    from .lan import Hub, LanDenied, build_server, check_bind, detect_lan_ip, ensure_certificate
    try:
        bind = check_bind(args.bind or detect_lan_ip())
    except (LanDenied, OSError, ValueError):
        print("Denied: --bind must be this Mac's private local-network IPv4 (e.g. 192.168.x.x). Public/all-interface binding is refused.", file=sys.stderr)
        return 1
    if not 1024 <= args.port <= 65535:
        print("Denied: choose a port 1024-65535.", file=sys.stderr)
        return 1
    print("LIVE LOCAL-NETWORK TERMINAL. Approved devices on this network get YOUR user's real shell.")
    print("Listening only on", bind, "- never port-forward this. Stop anytime with: quit (or Ctrl+C).")
    if input("Type ALLOW LAN TERMINAL to consent: ") != "ALLOW LAN TERMINAL":
        return 1
    home = os.path.expanduser("~")
    state = os.path.join(home, "Library", "Application Support", "Honeycomb") if platform.system() == "Darwin" else os.path.join(home, ".honeycomb")
    try:
        cert, key, der, fp = ensure_certificate(state, bind)
    except (OSError, subprocess.SubprocessError):
        print("Could not create the local TLS certificate (is /usr/bin/openssl present?).", file=sys.stderr)
        return 1
    authority = "%s:%d" % (bind, args.port)
    shell = pwd.getpwuid(os.getuid()).pw_shell or "/bin/zsh"
    hub = Hub(authority, [shell, "-l"], home, os.path.join(state, "lan-audit.jsonl"))
    try:
        server = build_server(hub, bind, args.port, cert, key, der, fp)
    except OSError:
        print("Port busy or address unavailable. Try --port 8766.", file=sys.stderr)
        return 1
    threading.Thread(target=server.serve_forever, daemon=True).start()
    def reaper():
        while True:
            time.sleep(30)
            hub.reap()
    threading.Thread(target=reaper, daemon=True).start()
    hub.audit("host_started")
    print("\nOn iPad/iPhone (same Wi-Fi) open:  https://%s" % authority)
    print("Certificate SHA-256 (must match the phone screen):\n  " + ":".join(fp[i:i+2] for i in range(0, len(fp), 2)))
    print("Pairing code (120 s, single use):", hub.new_code())
    print("Commands: code | approve ID | deny ID | devices | revoke ID | quit")
    try:
        while True:
            parts = input("honeycomb> ").strip().split()
            if not parts:
                continue
            try:
                if parts[0] == "code":
                    print("Pairing code (120 s, single use):", hub.new_code())
                elif parts[0] in ("approve", "deny") and len(parts) == 2:
                    hub.decide(parts[1], parts[0] == "approve")
                    print("Approved." if parts[0] == "approve" else "Denied.")
                elif parts[0] == "devices":
                    for did, d in hub.devices.items():
                        print(" ", did, d["name"], "REVOKED" if d["revoked"] else "active", "shell" if did in hub.sessions else "")
                elif parts[0] == "revoke" and len(parts) == 2:
                    hub.revoke(parts[1])
                    print("Revoked; its shell was closed.")
                elif parts[0] in ("quit", "exit"):
                    break
                else:
                    print("Unknown command.")
            except LanDenied as error:
                print("Refused:", error)
    except (EOFError, KeyboardInterrupt):
        pass
    finally:
        server.shutdown()
        hub.shutdown()
        print("\nStopped. All shells closed; nothing keeps listening.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())