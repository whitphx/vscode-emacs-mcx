---
"emacs-mcx": patch
---

Import the vendored `paredit.js` via a relative path instead of a `file:` dependency, avoiding the installation of its unused devDependencies (mocha, chai, uglify-js, ace.improved, …) into `node_modules`.
