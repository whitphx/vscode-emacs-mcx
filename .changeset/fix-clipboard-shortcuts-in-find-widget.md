---
"emacs-mcx": patch
---

Fix C-w, M-w, and C-y not firing in the find/replace/search/input-box widgets (regression from #2670 / #2748). The clipboard cut/copy/paste bindings now explicitly enumerate those focus contexts again, while keeping the Cursor Agent chat guard from #2748. Also re-enable C-w and M-w in the Windows find/replace widget so cut/copy work there too.
