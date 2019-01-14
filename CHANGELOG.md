# Change Log
All notable changes to the "emacs-mcx" extension will be documented in this file.

## [Unreleased]
- `C-x C-o` (delete-blank-lines)
- Improvements of kill-ring
    - to make the maximum length of kill ring configurable
    - to make it configurable to turn on and off kill-ring integration with clipboard
- To support more kinds of kill command
    - `M-d`: (kill-word)
    - `M-DEL`: ((backward-kill-word)
    - `C-x DEL`: (backward-kill-sentence)
    - `M-k`: (kill-sentence)
    - `C-M-k`: (kill-sexp)  # Maybe ignored
    - `M-z char`: (zap-to-char)  # Maybe ignored

## [0.1.3] - 2019-01-14
### Added
- `C-l` (recenter-top-bottom) (#40)
- To support `M-l` (downcase-word) and `M-u` (upcase-word) (#23)

### Fixed
- `C-g` (`ESC`) cancels continuous kill (#42)

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
