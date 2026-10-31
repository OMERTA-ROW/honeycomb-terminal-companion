"""Disposable local workspace tests. No owner files, accounts or editor launches."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from honeycomb.workspace import (initialize, diagnostics, quarantine_duplicate,
                                 restore_export, open_workspace, WorkspaceDenied)


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "workspace"

    def exports(self):
        initialize(self.root, True)
        exports = self.root / "exports"
        (exports / "original.txt").write_bytes(b"preserve original")
        (exports / "copy.txt").write_bytes(b"preserve original")
        (exports / "similar.txt").write_bytes(b"preserve differen")
        return exports

    def test_workspace_requires_explicit_consent(self):
        with self.assertRaisesRegex(WorkspaceDenied, "consent"):
            initialize(self.root, False)
        self.assertFalse(self.root.exists())

    def test_dedicated_workspace_preserves_existing_files(self):
        self.root.mkdir()
        (self.root / "private").write_text("keep")
        with self.assertRaisesRegex(WorkspaceDenied, "existing_folder"):
            initialize(self.root, True)
        self.assertEqual((self.root / "private").read_text(), "keep")

    def test_workspace_persistence_and_three_folders(self):
        root = initialize(self.root, True)
        for name in ("projects", "exports", "session-logs"):
            self.assertTrue((root / name).is_dir())
        (root / "projects" / "keep").write_text("project")
        initialize(self.root, True)
        self.assertEqual((root / "projects" / "keep").read_text(), "project")

    def test_symlink_ancestor_denied(self):
        target = Path(self.temp.name) / "target"
        target.mkdir()
        link = Path(self.temp.name) / "link"
        link.symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(WorkspaceDenied, "symlink"):
            initialize(link / "workspace", True)
        self.assertFalse((target / "workspace").exists())

    def test_scan_needs_consent_and_never_reads_projects(self):
        self.exports()
        (self.root / "projects" / "secret").write_bytes(b"preserve original")
        with self.assertRaisesRegex(WorkspaceDenied, "scan_consent"):
            diagnostics(self.root, False)
        result = diagnostics(self.root, True)
        self.assertEqual(result["files_checked"], 3)
        self.assertEqual(result["exact_duplicates"], [["copy.txt", "original.txt"]])
        self.assertEqual(result["recovered_bytes"], 0)

    def test_cleanup_requires_individual_consent_preserves_original(self):
        exports = self.exports()
        with self.assertRaisesRegex(WorkspaceDenied, "cleanup_consent"):
            quarantine_duplicate(self.root, "copy.txt", "original.txt", False)
        self.assertTrue((exports / "copy.txt").exists())
        identifier = quarantine_duplicate(self.root, "copy.txt", "original.txt", True)
        self.assertEqual((exports / "original.txt").read_bytes(), b"preserve original")
        self.assertEqual((self.root / ".review" / identifier).read_bytes(), b"preserve original")
        self.assertFalse((exports / "copy.txt").exists())
        restore_export(self.root, identifier, "copy.txt", True)
        self.assertEqual((exports / "copy.txt").read_bytes(), b"preserve original")

    def test_similar_files_never_cleanup_candidates(self):
        exports = self.exports()
        with self.assertRaisesRegex(WorkspaceDenied, "not_exact"):
            quarantine_duplicate(self.root, "similar.txt", "original.txt", True)
        self.assertTrue((exports / "similar.txt").exists())

    def test_cleanup_cannot_select_original_or_escape(self):
        self.exports()
        for selected in ("../projects/secret", "/etc/passwd", "original.txt"):
            with self.assertRaises(WorkspaceDenied):
                quarantine_duplicate(self.root, selected, "original.txt", True)
        self.assertTrue((self.root / "exports" / "original.txt").exists())

    def test_symlink_export_denied(self):
        exports = self.exports()
        (exports / "link").symlink_to(exports / "original.txt")
        self.assertEqual(diagnostics(self.root, True)["skipped"], 1)
        with self.assertRaises(WorkspaceDenied):
            quarantine_duplicate(self.root, "link", "original.txt", True)

    def test_restore_requires_consent_and_never_overwrites(self):
        exports = self.exports()
        identifier = quarantine_duplicate(self.root, "copy.txt", "original.txt", True)
        with self.assertRaisesRegex(WorkspaceDenied, "restore_consent"):
            restore_export(self.root, identifier, "copy.txt", False)
        (exports / "copy.txt").write_bytes(b"new copy")
        with self.assertRaises(FileExistsError):
            restore_export(self.root, identifier, "copy.txt", True)
        self.assertEqual((exports / "copy.txt").read_bytes(), b"new copy")
        self.assertTrue((self.root / ".review" / identifier).exists())

    @patch("honeycomb.workspace.subprocess.run")
    @patch("honeycomb.workspace.shutil.which", return_value="/mock/code")
    def test_vscode_only_local_selected_workspace_with_consent(self, which, run):
        initialize(self.root, True)
        with self.assertRaisesRegex(WorkspaceDenied, "consent"):
            open_workspace(self.root, True, False, "Darwin")
        run.assert_not_called()
        open_workspace(self.root, True, True, "Darwin")
        run.assert_called_once_with(["/mock/code", "--new-window", str(self.root / "projects")], check=True, timeout=15)

    @patch("honeycomb.workspace.subprocess.run")
    @patch("honeycomb.workspace.shutil.which", return_value=None)
    def test_missing_editor_and_nonmac_do_not_launch(self, which, run):
        initialize(self.root, True)
        with self.assertRaisesRegex(WorkspaceDenied, "vscode_cli_unavailable"):
            open_workspace(self.root, True, True, "Darwin")
        with self.assertRaisesRegex(WorkspaceDenied, "macos_required"):
            open_workspace(self.root, False, True, "Linux")
        run.assert_not_called()