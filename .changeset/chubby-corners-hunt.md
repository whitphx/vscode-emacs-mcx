---
"emacs-mcx": patch
---

isearchAbort (C-g) is triggered when findInputFocussed not findInputVisible because C-g during findInputVisible but not findInputFocussed is typically intended to cancel some operation on the browser but not isearch
