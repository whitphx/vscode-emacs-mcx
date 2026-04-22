---
"emacs-mcx": patch
---

Fix C-w (cut), M-w (copy), and C-y (paste) not firing in non-editor surfaces (regression from #2670 / #2748). The bindings now also work in:

- Find/replace/search/input-box widgets (C-w, M-w, and C-y).
- Webview-backed views — Markdown preview, Simple Browser, Release Notes, etc. — for C-w and M-w, which route to VS Code's built-in clipboard commands that are overridden internally to operate on the DOM selection.
- Windows find/replace widget (C-w and M-w removed from the Windows-only unbind list).

The editor-side emacs-mcx bindings (`killRegion`, `killRingSave`, `yank`) are preserved unchanged; they continue to take priority in the main editor via source ordering.
