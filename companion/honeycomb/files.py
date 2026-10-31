"""Save files sent from a paired device into the Mac's Honeycomb inbox.

Never executes anything: files are written 0600 (no execute bit), never
overwrite, and only land in the inbox or a sub-folder the Mac owner created
there themselves (that folder's existence is the authorization).
"""
import os
import re
import unicodedata

MAX_UPLOAD = 25 * 1024 * 1024
INBOX = "Inbox"
_BAD = re.compile(r"[^A-Za-z0-9 ._()\-]+")


class FileRefused(Exception):
    pass


def safe_name(raw):
    name = unicodedata.normalize("NFKC", raw or "").replace("\\", "/").split("/")[-1]
    name = _BAD.sub("_", name).strip(" .")[:120]
    if not name or name in (".", ".."):
        raise FileRefused("bad_name")
    return name


def destinations(root):
    """Inbox plus real (non-symlink) sub-folders the Mac owner created in it."""
    if not os.path.isdir(root) or os.path.islink(root):
        return []
    subs = sorted(e.name for e in os.scandir(root)
                  if e.is_dir(follow_symlinks=False) and not e.name.startswith("."))
    return [INBOX] + subs


def save(root, dest, name, data):
    if len(data) > MAX_UPLOAD:
        raise FileRefused("too_large")
    if dest not in destinations(root):
        raise FileRefused("destination_not_allowed")
    folder = root if dest == INBOX else os.path.join(root, dest)
    base, ext = os.path.splitext(safe_name(name))
    for n in range(1, 1000):
        candidate = os.path.join(folder, base + ("" if n == 1 else " (%d)" % n) + ext)
        try:
            fd = os.open(candidate, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        except FileExistsError:
            continue
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        return os.path.basename(candidate)
    raise FileRefused("name_exhausted")
