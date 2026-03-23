---
"emacs-mcx": minor
---

Add `just-one-space` command that deletes spaces and tabs around point, leaving one space by default; with a numeric prefix argument it leaves that many spaces, and with a negative prefix it also collapses surrounding newlines.

Add `cycle-spacing` command (M-SPC) that cycles through three actions on successive calls: first reduces whitespace to one space (just-one-space), then deletes all whitespace (delete-horizontal-space), then restores the original whitespace.
