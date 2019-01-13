# Change Log
All notable changes to the "emacs-mcx" extension will be documented in this file.

## [Unreleased]
- Improvements of kill-ring
    - to make the maximum length of kill ring configurable
    - to make it configurable to turn on and off kill-ring integration with clipboard
    - to support more kill commands
- To support `M-l` (downcase-word) and `M-u` (upcase-word)
- `C-l` (recenter-top-bottom)
- `C-x C-o` (delete-blank-lines)

## [0.1.2] - 2019-01-13
### Added
- New kill-ring and yank implementation to append continuous invokation of `C-k` (kill-line) (#26).
- Add sexp functionalities by importing [`haruhi-s.sexp`](https://marketplace.visualstudio.com/items?itemName=haruhi-s.sexp) (#27).

## [0.1.1] - 2019-01-12
### Added
- New keybinding `ESC` for cancel (`quit`) (#30).
- New keybinding `M-g M-g` for `goto-line` (#24).
- New keybinding `M-g M-n` and `M-g M-p` for `next-error` and `previous-error` respectively (#25).
- New keybinding `C-o` for `open-line` (#28).
- Improve mark-mode behavior with `C-M-n` (#29).
