---
"emacs-mcx": patch
---

Fix C-w (cut), M-w (copy), and C-y (paste) not firing in non-editor surfaces (regression from #2670 / #2748). The bindings now also work in:

- Find/replace/search/input-box widgets.
- Webview-backed views — Markdown preview, Simple Browser, Release Notes, etc. — where VS Code's built-in clipboard commands route to the webview DOM selection.
- Windows find/replace widget (C-w, M-w removed from the Windows-only unbind list).

The editor-side emacs-mcx bindings (`killRegion`, `killRingSave`, `yank`) are preserved unchanged; they continue to take priority in the main editor via source ordering.
