---
"emacs-mcx": patch
---

isearchAbort (C-g) is triggered when findInputFocussed not findWidgetVisible because C-g during findWidgetVisible but not findInputFocussed is typically intended to cancel some operation on the browser but not isearch
