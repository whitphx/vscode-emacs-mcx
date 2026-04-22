---
"emacs-mcx": patch
---

Fix Tab handling interfering with VS Code's Next Edit Suggestions. The `emacs-mcx.tabToTabStop` when clause now also excludes `inlineEditIsVisible`, so pressing Tab accepts an inline edit suggestion (e.g., from GitHub Copilot's Next Edit Suggestions) instead of being intercepted by Emacs-like tab behavior. Closes #2825.
