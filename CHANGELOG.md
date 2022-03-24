# Change Log
All notable changes to the "emacs-mcx" extension will be documented in this file.

## [Unreleased]

### Fix
- Restore the find widget string, #1271.

## [0.41.1] - 2022-03-21
### Fix
- Internal fix, #1258, #1259.

## [0.41.0] - 2022-03-21
### Add
- `emacs-mcx.enableDigitArgument` config, #1256.
- Regexp search and replace commands, #1257.

## [0.40.1] - 2022-03-20
### Fix
- Release process, #1254.

## [0.40.0] - 2022-03-20
### Add
- `M--` (negative-argument) and `-` after `C-u`, #1204.

### Fix
- `emacs-mcx.paredit.markSexp` supports a negative prefix argument, #1206.
- Internal package updates.
- Fix README about `editor.find.seedSearchStringFromSelection`, #1252.

## [0.39.0] - 2022-01-30
### Add
- `M-<number>` (digit-argument), #1199.
### Fix
- Assign `C-g` to all the commands which are assigned to "escape" by default, #1198.

## [0.38.0] - 2022-01-29
### Add
- `emacs-mcx.paredit.backwardKillSexp`, #1175.
- `emacs-mcx.paredit.markSexp`, #1181.

### Fix
- Drop `C-x C-k`, #1180.
- Cursor positions after `kill-region` in rect-mark-mode, #1187.

## [0.37.1] - 2022-01-01
### Fix
- Assign `C-i` to TAB, #1151.

## [0.37.0] - 2021-12-30
### Add
- `emacs-mcx.executeCommandWithPrefixArgument` command, #1150.

## [0.36.6] - 2021-12-18
### Fix
- Internal package updates.

## [0.36.5] - 2021-11-09
### Fix
- `C-a` and `C-e` move the cursor to the beginning or the end of the entire, not wrapped line, when `emacs-mcx.strictEmacsMove` flag is set, #1104.

## [0.36.5] - skipped
### Fix
- Release flow.

## [0.36.3] - 2021-11-05
### Fix
- Reset active region(s) on set mark when non-empty, #1089. @GregoryBL

## [0.36.2] - 2021-11-03
### Fix
- Reset viewport to search start on cancel, #1090. @GregoryBL

## [0.36.1] - 2021-10-23
### Fix
- Set empty strings to the command field to disable the keybindings instead of leaving the field undefined, #1081.

## [0.36.0] - 2021-10-04
### Add
- `C-x r t` (string-rectangle), #1049.

## [0.35.2] - 2021-09-26
### Fix
- Internal package updates and fixes.

## [0.35.1] - 2021-09-02
### Fix
- Internal package updates including `vsce`.

## [0.35.0] - 2021-09-02
### Fix
- Remove `web` and `workspace` from the `extensionKind` field and set only `ui`, #1002. @sandy081

## [0.34.0] - 2021-08-29
### Add
- VSCode Web support.

### Fix
- Revert VSCode upgrade in 0.33.1, #995.

## [0.33.3] - 2021-08-16
### Fix
- Add "browser" field in `package.json`, #969.

## [0.33.2] - 2021-08-16
### Fix
- Add "web" to "extensionKind" field in `package.json`, #967.

## [0.33.1] - 2021-08-16
### Fix
- Dependencies updates.
- Upgrade VSCode compatibility to 1.59.0.

## [0.33.0] - 2021-08-09
### Add
- `C-x r p` as an alternative to `C-x r t`. See https://github.com/whitphx/vscode-emacs-mcx/issues/924 for the details. #923. @shengofsun

## [0.32.0] - 2021-05-30
### Add
- (Experimental) `C-x <SPC>` (rectangle-mark-mode), #819.
- Rectangle kill, copy, delete and yank commands (`C-x r k`, `C-x r M-w`, `C-x r d`, `C-x r y`), #825.
- open-rectangle command (`C-x r o`), #845.
- clear-rectangle command (`C-x r c`), #844.

### Fix
- Fix beginning-of-buffer and end-of-buffer not to push mark if mark-mode has already been started, #839.

## [0.31.0] - 2021-04-20
### Fixed
- Use `isearchExit` with `then` arg instead of `executeCommands` to quit the find widget with key press.

## [0.30.0] - 2021-04-16
### Added
- `C-x s` for `workbench.action.files.saveAll`, #770.
### Fixed
- Revealing cursor behaviors are fixed for some commands (forward/backward-char/paragraph), #766, #768.
- Promise execution of `executeCommands` command is fixed, #767.
- When-clause conditions of `C-s` and `C-r` are changed from `findWidgetVisible` to `findInputFocussed`.

## [0.29.0] - 2021-04-10
### Fixed
- Disable Emacs-like cursor movements when the find or replace widgets are focused on Windows, because the cursor on the OS native UIs cannot be controlled by extensions.

## [0.28.0] - 2021-04-09
### Added
- Add `C-x C-c`.

### Fixed
- Internal fixes by @a-stewart.

## [0.27.0] - 2021-02-13
### Fixed
- Fix yank to set the mark at the beginning of the inserted text.
- Fix i-search to add the original value of point to the mark ring when exiting.
- Fix beginning-of-buffer and end-of-buffer to set the mark.

## [0.26.0] - 2021-02-04
### Added
- `emacs-mcx.cursorMoveOnFindWidget` option.

## [0.25.0] - 2021-01-29
### Added
- `C-@` for mark and `C-_` for undo.

## [0.24.1] - 2021-01-09
### Fix
- Change the maintainer's username.

## [0.24.0] - 2020-12-30
### Added
- `useMetaPrefixCtrlLeftBracket` option to use `ctrl+[` as a meta key.

## [0.23.7] - 2020-12-24
### Fixed
- Internal package updates.
- Release steps are automated by GitHub actions

## [0.23.6] - 2020-11-12
### Fixed
- Keybindings are ignored on the find widget during IME composition.

## [0.23.5] - 2020-10-23
### Added
- `C-m` to pick the selected item in the quick open widget.

### Fixed
- Internal implementation has been fixed to dispose resources such as registered event listeners.

## [0.23.4] - 2020-10-22
### Fixed
- `yank` and `yankPop` are fixed to work in the same way as VSCode's `paste` command, in the case of multi-cursors in a single line.

## [0.23.3] - 2020-10-20
### Fixed
- `yank` and `yankPop` are fixed to work with auto formatting on paste.

## [0.23.2] - 2020-10-18
### Fixed
- `C-p` and `C-n` on the quick open widget are fixed to only select items but not navigate.
- Kill commands are fixed to reveal the cursor after execution.

## [0.23.1] - 2020-10-17
### Fixed
- Bug fix to invoke features such as auto-completion reacting to character inputs.

## [0.23.0] - 2020-10-17
### Fixed
- `C-u` (universal-argument) is reimplemented not to use VSCode API's `type` command by default.

## [0.22.2] - 2020-10-16
### Added
- `M-\` is assigned to IntelliSense suggestion. @vaelen

## [0.22.1] - 2020-10-14
### Fixed
- Allow navigation within query replace prompt. @ANorwell
- Internal package updates.

## [0.22.0] - 2020-10-04
### Added
- `M-m` (`back-to-indentation`)
- `C-M-k` (`kill-sexp`)

## [0.21.0] - 2020-10-01
### Fixed
- Use VS Code clipboard API instead of clipboardy.
- Add "workspace" to "extensionKind" manifest to work in remote.

## [0.20.5] - 2020-09-22
### Fixed
- Fix not to close the find widget by Enter key if replace input is focussed.
- Internal package updates.

## [0.20.4] - 2020-09-12
### Fixed
- Internal fix and updating dependencies.
- Fix `killWord` and `backwardKillWord` to respect `editor.wordSeparators` config.

## [0.20.3] - 2020-09-08
### Added
- `emacs-mcx.disableOverridingTypeCommand` option to disable overriding `type` command.

## [0.20.2] - 2020-07-23
### Fixed
- Keybindings starting with `C-x` are still disabled in the terminals, but enabled in other focuses such as sidebar.
- `C-p` and `C-n` are fixed to work as cursor movement when intelli-sense is visible the number of whose items is just one.

## [0.20.1] - 2020-07-12
### Fixed
- Keybindings starting with `C-x` are disabled in integrated terminals. @youyuanwu

## [0.20.0] - 2020-07-11
### Added
- Implement the Mark Ring and its related commands:
  - `set-mark-command` is updated to push mark positions to the Mark Ring.
  - `exchange-point-and-mark` is added.
- Assign `Enter` key to close the find widget, which is like the original Emacs' behavior.
- `killWholeLine` config option.

### Fixed
- Fix `kill` and `kill-whole-line` to work based on active cursors, not anchors.
- Async commands behavior including kill, yank, and type.

## [0.19.9] - 2020-07-02
- Fix `M-w` behavior when the find widget is visible. @youyuanwu

## [0.19.8] - 2020-07-01
- Internal package updates.

### Fixed
- Fix `forwardSexp` and `backwardSexp` to reveal the primary active cursor.
- Internal fix of Configuration and Message implementations.

## [0.19.6] - 2020-05-09
### Fixed
- `C-x b` is mapped to `workbench.action.showAllEditorsByRecentlyUsed` command, whose behavior is closer to the original Emacs'. @joeshaw

## [0.19.5] - 2020-05-04
### Fixed
- Internal fix to call clipboardy asynchronously.
- Internal fix to omit unnecessary files from the bundle.

## [0.19.4] - 2020-04-26
### Fixed
- Fix a bug at bundling to make clipboardy work on Linux.
- Fix internally keybinding definitions to be generated by a script.

## [0.19.3] - 2020-04-26
### Fixed
- Fix `useMetaPrefixMacCmd` option to enable only the Command key to work as a meta key and disable the Alt key.

## [0.19.2] - 2020-04-26
### Fixed
- Fix a bug at bundling to make clipboardy work on Windows.

## [0.19.1] - 2020-04-25
### Fixed
- Introduce Webpack to bundle the source code to improve performance and reduce package size.

## [0.19.0] - 2020-04-25
### Added
- `useMetaPrefixMacCmd` option to use Command (⌘) key as a meta key. @flindeberg

## [0.18.0] - 2020-03-19
### Added
- `useMetaPrefixEscape` option to use ESC key as a meta key. @yunkya2

### Fixed
- Fix `C-b` and `C-Enter` behavior with the find/replace widget. @yunkya2

## [0.17.0] - 2020-03-16
### Fixed
- Fix `C-s` (isearch-forward) and `C-r` (isearch-backward) to start searching immediately after the find widget appears. @joeshaw

## [0.16.0] - 2020-03-16
### Added
- Add `M-{` (backward-paragraph) and `M-}` (forward-paragraph). @icub3d

## [0.15.0] - 2020-03-16
### Added
- Add `M-c` (capitalize-word). @yunkya2

## [0.14.1] - 2020-02-21
- Internal changes including code formatting.

## [0.14.0] - 2020-02-19
- Internal package updates.

## [0.13.0] - 2019-08-29
### Added
- Add `M-^` (delete-indentation). @aki77

## [0.12.1] - 2019-07-23
### Fixed
- Update vulnerable dependencies for security.

## [0.12.0] - 2019-05-21
### Added
- Strictly emacs-like behaviors of `C-a`, `C-v` and `M-v`. @joeshaw
- Config to switch between strictly emacs-line behaviors and VSCode's native ones.
- Correct behavior of `C-v` and `M-v` with a prefix argument. @GuyShane
- Document `C-j` conflict and provide replacement `C-x j`. @jedbrown

## [0.11.3] - 2019-05-06
### Added
- Set extensionKind to support Remote Development. @limon

## [0.11.2] - 2019-04-11
### Added
- Logging system is introduced to some code especially around prefix argument functionality.
- Logging levels are configurable (`emacs-mcx.debug.*`).

## [0.11.1] - 2019-03-13
### Added
- The maximum number of kill ring entries is now configurable (`emacs-mcx.killRingMax`).

### Fixed
- A bug at yank of empty string is fixed.

## [0.11.0] - 2019-03-12
### Added
- `kill-word` and `backward-kill-word` are now supported and assigned to `M-d` and `M-DEL` respectively.
- `kill-word` and `backward-kill-word` now support prefix argument.

## [0.10.0] - 2019-03-01
### Added
- `C-M-p` (`emacs-mcx.addSelectionToPreviousFindMatch`) is supported.
- Command implementations are drastically changed to be class-based.

### Fixed
- Fix `emacs-mcx.paredit.forwardDownSexp` and `emacs-mcx.paredit.backwardUpSexp` to ignore semicolon in non-lisp languages correctly.

## [0.9.4] - 2019-02-27
### Fixed
- Update `emacs-mcx.paredit.forwardDownSexp` and `emacs-mcx.paredit.backwardUpSexp` to treat a semicolon as one entity, but not comment.

## [0.9.3] - 2019-02-22
### Fixed
- Internal implementation of `C-l` (recenter-top-bottom) is updated.
- A message representing the prefix argument is shown.

## [0.9.2] - 2019-02-19
### Fixed
- `C-m` is fixed to behave more like ENTER.
- `C-m` is fixed to work with prefix argument.
- `emacs-mcx.paredit.forwardDownSexp` and `emacs-mcx.paredit.backwardUpSexp` are implemented (not assigned to keys).

## [0.9.1] - 2019-02-19
### Added
- `forward-sexp` and `backward-sexp` are updated to support prefix argument.

## [0.9.0] - 2019-02-18
### Added
- Many commands hide the find widget like the original behavior of emacs' i-search. by @ganaware
- `forward-sexp` and `backward-sexp` are fixed to reveal the cursor. by @ganaware

## [0.8.0] - 2019-02-17
### Added
- `C-h` (delete-backward-char) and `C-d` (delete-forward-char) now support prefix argument.

## [0.7.0] - 2019-02-15
### Added
- `C-k` (kill-line) now supports prefix argument.

### Fixed
-  Behaviors of `C-f` (forward-char) and `C-b` (backward-char) are modified to move cursors over multiple lines when prefix argument specified.

## [0.6.0] - 2019-02-13
### Added
- Run CI on Windows
- Sexp navigations with mark-mode compatibility
    - A dependency to an external extension `haruhi-s.sexp` is eliminated.

## [0.5.0] - 2019-02-12
### Added
- `C-u` (universal-argument) is implemented.
- Prefix argument is supported with single character inputs and movement commands.

## [0.4.0] - 2019-01-23
### Added
- A `when` clause context `emacs-mcx.inMarkMode` is supported.

## [0.3.0] - 2019-01-20
### Added
- `C-x C-o` (delete-blank-lines)

## [0.2.0] - 2019-01-20
### Added
- `emacs-mcx.transformTo(Upper|Lower)case` are implemented and assigned to `M-u`, `C-x C-u` and `M-l`, `C-x C-l` respectively. However, the current implementation has a drawback in the case there are multiple cursors and empty and non-empty selections are mixed.

## [0.1.5] - 2019-01-18
### Fixed
- status bar messages disappear when other operations are invoked (or 10 seconds after they appear).

## [0.1.4] - 2019-01-14
### Fixed
- Fix `ESC` not to override existent necessary keybindings
- Fix yank-pop to show a status bar message if invoked not after yank

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
