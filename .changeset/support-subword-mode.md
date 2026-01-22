---
"emacs-mcx": minor
---

Add subword mode support for word-oriented navigation and editing commands.

When `emacs-mcx.subwordMode` is enabled (and `emacs-mcx.wordNavigationStyle` is set to `"emacs"`), commands like `M-f`, `M-b`, and `M-d` will recognize subword boundaries in camelCase, PascalCase, and snake_case identifiers, mirroring Emacs's `subword-mode`.
