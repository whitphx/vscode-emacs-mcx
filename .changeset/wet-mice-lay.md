---
"emacs-mcx": patch
---

Fix cmd+x (Cut) not working in Cursor's Agent chat input by adding textInputFocus guard to clipboard keybindings (ctrl+w, meta+w, ctrl+y) so they only activate in actual text input widgets.
