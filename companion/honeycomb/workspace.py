"""Local-console tools only. No remote adapter, deletion or background scans.

The workspace is explicitly selected by the owner. Quarantine is limited to
top-level exports and preserves both bytes and a matching original copy.
"""
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import stat
import subprocess


class WorkspaceDenied(ValueError):
    pass


FOLDERS = ("projects", "exports", "session-logs", ".review")


def workspace_root(path):
    root = Path(path).expanduser().absolute()
    # Reject symlink roots AND ancestors rather than following them silently.
    for part in (root, *root.parents):
        if part.is_symlink():
            raise WorkspaceDenied("symlink_denied")
    return root


def initialize(path, consent):
    if not consent:
        raise WorkspaceDenied("workspace_consent_required")
    root = workspace_root(path)
    # Only a new or already initialized dedicated folder is accepted.
    if root.exists() and not (root / ".honeycomb-workspace").is_file():
        raise WorkspaceDenied("existing_folder_denied")
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    for folder in FOLDERS:
        target = root / folder
        if target.is_symlink():
            raise WorkspaceDenied("symlink_denied")
        target.mkdir(mode=0o700, exist_ok=True)
    marker = root / ".honeycomb-workspace"
    if marker.is_symlink():
        raise WorkspaceDenied("symlink_denied")
    marker.touch(mode=0o600, exist_ok=True)
    return root


def require_workspace(path):
    root = workspace_root(path)
    marker = root / ".honeycomb-workspace"
    if marker.is_symlink() or not marker.is_file():
        raise WorkspaceDenied("workspace_not_initialized")
    for folder in FOLDERS:
        if (root / folder).is_symlink() or not (root / folder).is_dir():
            raise WorkspaceDenied("workspace_folder_denied")
    return root


def digest_file(path, max_bytes=64 * 1024 * 1024):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > max_bytes:
            raise WorkspaceDenied("file_limit_or_type")
        digest = hashlib.sha256()
        read = 0
        while True:
            block = os.read(fd, 65536)
            if not block:
                break
            read += len(block)
            if read > max_bytes:
                raise WorkspaceDenied("file_limit_or_type")
            digest.update(block)
        after = os.fstat(fd)
        if (info.st_size, info.st_mtime_ns, info.st_ino) != (after.st_size, after.st_mtime_ns, after.st_ino):
            raise WorkspaceDenied("file_changed")
        return read, digest.hexdigest()
    finally:
        os.close(fd)


def diagnostics(path, consent):
    if not consent:
        raise WorkspaceDenied("scan_consent_required")
    root = require_workspace(path)
    # No recursion into projects, cloud folders or the rest of the disk.
    files, skipped, groups = 0, 0, {}
    for entry in sorted((root / "exports").iterdir()):
        if files + skipped >= 500:
            raise WorkspaceDenied("scan_file_limit")
        try:
            if entry.is_symlink():
                raise WorkspaceDenied("symlink_denied")
            size, digest = digest_file(entry)
        except (OSError, WorkspaceDenied):
            skipped += 1
            continue
        files += 1
        groups.setdefault((size, digest), []).append(entry.name)
    usage = shutil.disk_usage(root)
    return {"files_checked": files, "skipped": skipped,
            "free_bytes": usage.free, "total_bytes": usage.total,
            "exact_duplicates": [names for names in groups.values() if len(names) > 1],
            "recovered_bytes": 0}


def selected_export(root, name):
    if not name or name in (".", "..") or Path(name).name != name or "\\" in name:
        raise WorkspaceDenied("export_selection_denied")
    target = root / "exports" / name
    if target.is_symlink():
        raise WorkspaceDenied("symlink_denied")
    return target


def quarantine_duplicate(path, selected, keeper, consent):
    if not consent:
        raise WorkspaceDenied("cleanup_consent_required")
    root = require_workspace(path)
    source, original = selected_export(root, selected), selected_export(root, keeper)
    if source == original:
        raise WorkspaceDenied("original_required")
    before = source.stat(follow_symlinks=False)
    if digest_file(source) != digest_file(original):
        raise WorkspaceDenied("not_exact_duplicate")
    # Refuse hard links: quarantine must not be confused with independent copies.
    if before.st_nlink != 1 or before.st_ino == original.stat(follow_symlinks=False).st_ino:
        raise WorkspaceDenied("independent_copy_required")
    after = source.stat(follow_symlinks=False)
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
        raise WorkspaceDenied("file_changed")
    identifier = secrets.token_hex(16)
    destination = root / ".review" / identifier
    # Same-filesystem, reversible move. Never report freed disk space.
    source.rename(destination)
    return identifier


def restore_export(path, identifier, name, consent):
    if not consent:
        raise WorkspaceDenied("restore_consent_required")
    root = require_workspace(path)
    if len(identifier) != 32 or any(c not in "0123456789abcdef" for c in identifier):
        raise WorkspaceDenied("review_selection_denied")
    source = root / ".review" / identifier
    digest_file(source)
    destination = selected_export(root, name)
    # link is atomic and refuses to overwrite an existing name.
    os.link(source, destination, follow_symlinks=False)
    source.unlink()


def open_workspace(path, editor, consent, system):
    if not consent:
        raise WorkspaceDenied("open_consent_required")
    root = require_workspace(path)
    if system != "Darwin":
        raise WorkspaceDenied("macos_required")
    if editor:
        executable = shutil.which("code")
        if not executable:
            raise WorkspaceDenied("vscode_cli_unavailable")
        # CLI opens a local selected folder only. No tunnel, extension install or shell.
        subprocess.run([executable, "--new-window", str(root / "projects")], check=True, timeout=15)
    else:
        subprocess.run(["/usr/bin/open", str(root)], check=True, timeout=15)