# Change Log

## 0.99.2

### Patch Changes

- [#2641](https://github.com/whitphx/vscode-emacs-mcx/pull/2641) [`452dca3`](https://github.com/whitphx/vscode-emacs-mcx/commit/452dca356ff6ff11812a5d44ece2b314984718d8) Thanks [@whitphx](https://github.com/whitphx)! - Fix mark-sexp command to show a message

- [#2642](https://github.com/whitphx/vscode-emacs-mcx/pull/2642) [`867b547`](https://github.com/whitphx/vscode-emacs-mcx/commit/867b547b4da81ea9680cc48a9288283cf5714901) Thanks [@whitphx](https://github.com/whitphx)! - Update README.md about web extension compatibility

## 0.99.1

### Patch Changes

- [#2631](https://github.com/whitphx/vscode-emacs-mcx/pull/2631) [`23239d1`](https://github.com/whitphx/vscode-emacs-mcx/commit/23239d10f279fbedfabd47e3f4bb1129d01a9396) Thanks [@whitphx](https://github.com/whitphx)! - Defer showing messages until command execution finishes to prevent them from being interrupted by changes made by the command itself

- [#2637](https://github.com/whitphx/vscode-emacs-mcx/pull/2637) [`3d099e5`](https://github.com/whitphx/vscode-emacs-mcx/commit/3d099e5b6db098ecb78b726c362cb6531f30137b) Thanks [@whitphx](https://github.com/whitphx)! - Refactoring type annotations on move commands

## 0.99.0

### Minor Changes

- [#2629](https://github.com/whitphx/vscode-emacs-mcx/pull/2629) [`1135d95`](https://github.com/whitphx/vscode-emacs-mcx/commit/1135d95043f2dc6512ad3f96186f4f38940f5776) Thanks [@whitphx](https://github.com/whitphx)! - Add shift-selection variations of nextLine, previousLine, moveBeginningOfLine, moveEndOfLine, forwardWord, and backwardWord

## 0.98.2

### Patch Changes

- [#2624](https://github.com/whitphx/vscode-emacs-mcx/pull/2624) [`276b89b`](https://github.com/whitphx/vscode-emacs-mcx/commit/276b89b335955828e90e95d491753964c724d7a1) Thanks [@whitphx](https://github.com/whitphx)! - Refactoring EmacsEmulator

- [#2623](https://github.com/whitphx/vscode-emacs-mcx/pull/2623) [`eea4099`](https://github.com/whitphx/vscode-emacs-mcx/commit/eea409984e1e93aca8715169fcd9693d8f870b16) Thanks [@whitphx](https://github.com/whitphx)! - Refactoring PrefixArgumentHandler constructor

- [#2621](https://github.com/whitphx/vscode-emacs-mcx/pull/2621) [`7be2d85`](https://github.com/whitphx/vscode-emacs-mcx/commit/7be2d8598aa765b811f067a28d5b8180b1286b51) Thanks [@whitphx](https://github.com/whitphx)! - Update MessageManager.dispose() to unset the singleton instance

- [#2625](https://github.com/whitphx/vscode-emacs-mcx/pull/2625) [`abaa12a`](https://github.com/whitphx/vscode-emacs-mcx/commit/abaa12a6ee0885e185d9fa47840c64db77904941) Thanks [@whitphx](https://github.com/whitphx)! - Update the keybinding generator to handle shift variants

## 0.98.1

### Patch Changes

- [#2619](https://github.com/whitphx/vscode-emacs-mcx/pull/2619) [`60d8fbf`](https://github.com/whitphx/vscode-emacs-mcx/commit/60d8fbf3b5203f4d57bef9137414a71f1be09c4a) Thanks [@whitphx](https://github.com/whitphx)! - Fix keybinding definition in package.json to use kill-ring-save instead of copy-region

## 0.98.0

### Minor Changes

- [#2616](https://github.com/whitphx/vscode-emacs-mcx/pull/2616) [`bd8f84b`](https://github.com/whitphx/vscode-emacs-mcx/commit/bd8f84b78435463d12bb9a08e8c5df9881487ac7) Thanks [@whitphx](https://github.com/whitphx)! - Change the structure of 'then' arg passed to isearchExit

- [#2616](https://github.com/whitphx/vscode-emacs-mcx/pull/2616) [`bd8f84b`](https://github.com/whitphx/vscode-emacs-mcx/commit/bd8f84b78435463d12bb9a08e8c5df9881487ac7) Thanks [@whitphx](https://github.com/whitphx)! - Add `emacs-mcx.clearSelectionBeforeCharMove` to control whether forwardChar/backwardChar clear selections (Emacs-like) or keep VS Code’s default collapse behavior.

- [#2616](https://github.com/whitphx/vscode-emacs-mcx/pull/2616) [`bd8f84b`](https://github.com/whitphx/vscode-emacs-mcx/commit/bd8f84b78435463d12bb9a08e8c5df9881487ac7) Thanks [@whitphx](https://github.com/whitphx)! - Add Shift variants for forward/backward char/word with selection (C-S-f/C-S-b/M-S-f/M-S-b) and support a `shift` flag in move commands to extend selections without entering mark mode.

## 0.97.1

### Patch Changes

- [#2612](https://github.com/whitphx/vscode-emacs-mcx/pull/2612) [`15a7e37`](https://github.com/whitphx/vscode-emacs-mcx/commit/15a7e37bd21c6f54571ca433f1fabddb6ecaf965) Thanks [@github-actions](https://github.com/apps/github-actions)! - Update keybindings from the latest remote definitions.

- [#2615](https://github.com/whitphx/vscode-emacs-mcx/pull/2615) [`eba1921`](https://github.com/whitphx/vscode-emacs-mcx/commit/eba192188d804dc9d111ea4074e332292c9777f7) Thanks [@whitphx](https://github.com/whitphx)! - Fix popMark() to deactivate mark mode

## 0.97.0

### Minor Changes

- [#2605](https://github.com/whitphx/vscode-emacs-mcx/pull/2605) [`7cf738f`](https://github.com/whitphx/vscode-emacs-mcx/commit/7cf738ffbfd919ab26a480323c4e6a0afa8dd840) Thanks [@whitphx](https://github.com/whitphx)! - Rename copyRegion to killRingSave

### Patch Changes

- [`015c7a2`](https://github.com/whitphx/vscode-emacs-mcx/commit/015c7a271d2a0a2090077fbd17b7117ade85f3f4) Thanks [@whitphx](https://github.com/whitphx)! - Refactoring to fix typo: https://github.com/whitphx/vscode-emacs-mcx/pull/2606

- [#2603](https://github.com/whitphx/vscode-emacs-mcx/pull/2603) [`c9be890`](https://github.com/whitphx/vscode-emacs-mcx/commit/c9be8902b9c592c81f9aab23d337c47f57fcf5d3) Thanks [@whitphx](https://github.com/whitphx)! - Fix the condition check to fall back to the built-in paste command

- [#2600](https://github.com/whitphx/vscode-emacs-mcx/pull/2600) [`50972de`](https://github.com/whitphx/vscode-emacs-mcx/commit/50972de66a7f1be0e5b83ca3d14d9df7083850e2) Thanks [@whitphx](https://github.com/whitphx)! - Fix yank to fall back to the built-in paste command when possible to make use of rich paste features such as multimedia data handling

- [#2602](https://github.com/whitphx/vscode-emacs-mcx/pull/2602) [`fbd85bb`](https://github.com/whitphx/vscode-emacs-mcx/commit/fbd85bbb399eda6efa2fb33f8173ef7125913559) Thanks [@whitphx](https://github.com/whitphx)! - Support forwardWord and backwardWord in rectangle-mark-mode

## 0.96.0

### Minor Changes

- [`52f7614`](https://github.com/whitphx/vscode-emacs-mcx/commit/52f761401216403523350f548465de900da9a469) Thanks [@whitphx](https://github.com/whitphx)! - Add word boundary mode config to emulate VSCode/Emacs word boundary better with forwardWord/backwardWord/killWord/backwardKillWord commands.
  https://github.com/whitphx/vscode-emacs-mcx/pull/2592

### Patch Changes

- [#2597](https://github.com/whitphx/vscode-emacs-mcx/pull/2597) [`1ffcf03`](https://github.com/whitphx/vscode-emacs-mcx/commit/1ffcf0371e1acd536f1a4515c661cc3c40cc0f9c) Thanks [@whitphx](https://github.com/whitphx)! - Internal refactoring around pasting by kill-yank commands

## 0.95.1

### Patch Changes

- [#2587](https://github.com/whitphx/vscode-emacs-mcx/pull/2587) [`39c74ce`](https://github.com/whitphx/vscode-emacs-mcx/commit/39c74ce048012795e3c13b3de8852b0ee5718d1a) Thanks [@whitphx](https://github.com/whitphx)! - isearchAbort (C-g) is triggered when findInputFocussed not findWidgetVisible because C-g during findWidgetVisible but not findInputFocussed is typically intended to cancel some operation on the browser but not isearch

## 0.95.0

### Minor Changes

- [#2585](https://github.com/whitphx/vscode-emacs-mcx/pull/2585) [`6d02b36`](https://github.com/whitphx/vscode-emacs-mcx/commit/6d02b36fcb21630e5abfe3f63494e5c608657ace) Thanks [@whitphx](https://github.com/whitphx)! - Fix terminal keybindings; `C-SPC` and `C-x C-s` work in Emacs in the terminal, `C-s` is removed from the terminal-level keybinding to open VSC find widget, keybindings to open suggestions same as the editor

## 0.94.9

### Patch Changes

- [#2583](https://github.com/whitphx/vscode-emacs-mcx/pull/2583) [`cc844dd`](https://github.com/whitphx/vscode-emacs-mcx/commit/cc844dd8861094f76855b5cb00eafc6351a65529) Thanks [@whitphx](https://github.com/whitphx)! - Fix `C-x <SPC>` to always enable rectangle-mark-mode when prefix argument exists

- [#2581](https://github.com/whitphx/vscode-emacs-mcx/pull/2581) [`1ed05e2`](https://github.com/whitphx/vscode-emacs-mcx/commit/1ed05e2b3f115f49123ff4e876b7dbd086d23d86) Thanks [@whitphx](https://github.com/whitphx)! - Run rectangle commands from rectangle-mark-mode

## 0.94.8

### Patch Changes

- [#2546](https://github.com/whitphx/vscode-emacs-mcx/pull/2546) [`535b78b`](https://github.com/whitphx/vscode-emacs-mcx/commit/535b78b206bfaef3e3ae4a6dfe08e0fc391b8a49) Thanks [@whitphx](https://github.com/whitphx)! - Dispatch Changesets as a GitHub App

## 0.94.7

### Patch Changes

- [#2544](https://github.com/whitphx/vscode-emacs-mcx/pull/2544) [`2afb34d`](https://github.com/whitphx/vscode-emacs-mcx/commit/2afb34d0b4bee075d98ec1ffa868a72bcd3ca8d4) Thanks [@whitphx](https://github.com/whitphx)! - Fix changesets config

## 0.94.6

### Patch Changes

- [#2540](https://github.com/whitphx/vscode-emacs-mcx/pull/2540) [`07cfb57`](https://github.com/whitphx/vscode-emacs-mcx/commit/07cfb57a5de2727bf74b46faab0b5cf8815f1bb4) Thanks [@whitphx](https://github.com/whitphx)! - Fix permission settings in the changeset workflow

## 0.94.5

### Patch Changes

- [#2539](https://github.com/whitphx/vscode-emacs-mcx/pull/2539) [`e78a50d`](https://github.com/whitphx/vscode-emacs-mcx/commit/e78a50d26d19bb6591072314fa608db025e43220) Thanks [@whitphx](https://github.com/whitphx)! - Update changelog generator to use GitHub info

## 0.94.4

### Patch Changes

- c68ab52: Fix the release workflow to make each GitHub release contain vsix files

## 0.94.3

### Patch Changes

- 110e040: Introduce Changesets for versioning and publishing

## 0.94.2

### Patch Changes

- 090e13c: Introduce Changesets for versioning and publishing

## [0.94.0] - 2025-11-14

### Fix

- Fix terminal keybinding for code completions, [#2529](https://github.com/whitphx/vscode-emacs-mcx/pull/2529).

### Change

- Set the minimum supported VSCode version to 1.106.0, [#2529](https://github.com/whitphx/vscode-emacs-mcx/pull/2529).

## [0.93.0] - 2025-10-26

### Add

- Update README intro, [#2512](https://github.com/whitphx/vscode-emacs-mcx/pull/2512).
- `transpose-chars` command, [#2511](https://github.com/whitphx/vscode-emacs-mcx/pull/2511).

## [0.92.0] - 2025-10-25

### Add

- `ESC ESC ESC` to cancel operations, [#2507](https://github.com/whitphx/vscode-emacs-mcx/pull/2507).
- `transpose-lines` command, [#2508](https://github.com/whitphx/vscode-emacs-mcx/pull/2508).

## [0.91.0] - 2025-09-19

### Changed

- Delete `ctrl+x 2`, `ctrl+x 3`, and `ctrl+x 0` keybindings in the terminal to avoid conflicts with terminal input, [#2461](https://github.com/whitphx/vscode-emacs-mcx/pull/2461).

## [0.90.8] - 2025-09-02

### Fix

- Fix `move-beginning-of-line` to reveal the left-most cursor, [#2444](https://github.com/whitphx/vscode-emacs-mcx/pull/2444).

## [0.90.7] - 2025-08-25

### Fix

- Internal updates on the release workflow.

## [0.90.6] - Skipped

## [0.90.5] - Skipped

## [0.90.4] - Skipped

## [0.90.3] - 2025-08-25

### Fix

- Internal updates on the release workflow.

## [0.90.2] - 2025-08-25

### Fix

- Internal updates on the release workflow.

## [0.90.1] - 2025-08-22

### Fix

- Bind `C-p` and `C-n` to `workbench.action.quickOpenSelectPrevious` and `workbench.action.quickOpenSelectNext` respectively for all platforms, [#2432](https://github.com/whitphx/vscode-emacs-mcx/pull/2432)
- Ignore the unnecessary `keybindings/` directory in the package, [#2433](https://github.com/whitphx/vscode-emacs-mcx/pull/2433).

## [0.90.0] - 2025-08-19

### Add

- Delete button for kill ring items, [#2428](https://github.com/whitphx/vscode-emacs-mcx/pull/2428).

## [0.89.2] - 2025-08-18

### Fix

- Internal refactoring, [#2426](https://github.com/whitphx/vscode-emacs-mcx/pull/2426), [#2427](https://github.com/whitphx/vscode-emacs-mcx/pull/2427).

## [0.89.1] - 2025-08-18

### Fix

- Internal refactoring, [#2424](https://github.com/whitphx/vscode-emacs-mcx/pull/2424), [#2425](https://github.com/whitphx/vscode-emacs-mcx/pull/2425).

## [0.89.0] - 2025-08-15

### Add

- `prefixArgument` overrides, [#2419](https://github.com/whitphx/vscode-emacs-mcx/pull/2419).

## [0.88.12] - 2025-08-15

### Fix

- Configure `up/down/C-p/C-n` keybindings for Jupyter interactive window, [#2418](https://github.com/whitphx/vscode-emacs-mcx/pull/2418).

## [0.88.11] - 2025-08-14

### Fix

- Update `C-g` keybindings, [#2414](https://github.com/whitphx/vscode-emacs-mcx/pull/2414).
- Internal refactoring, [#2413](https://github.com/whitphx/vscode-emacs-mcx/pull/2413).
- Internal package updates.

## [0.88.10] - 2025-08-05

### Fix

- Internal refactoring, [#2400](https://github.com/whitphx/vscode-emacs-mcx/pull/2400).

## [0.88.9] - 2025-08-05

### Fix

- Key strokes for the register commands are interrupted when the text editors are switched, [#2399](https://github.com/whitphx/vscode-emacs-mcx/pull/2399).

## [0.88.8] - 2025-08-04

### Fix

- Internal refactoring, [#2393](https://github.com/whitphx/vscode-emacs-mcx/pull/2393).
- Add prefixes to loggers, [#2394](https://github.com/whitphx/vscode-emacs-mcx/pull/2394).
- `isearch-exit`, [#2395](https://github.com/whitphx/vscode-emacs-mcx/pull/2395).

## [0.88.7] - 2025-08-04

### Fix

- Internal refactoring of command instantiation, [#2391](https://github.com/whitphx/vscode-emacs-mcx/pull/2391).

## [0.88.6] - 2025-08-04

### Fix

- Share the killed rectangle across all editors, [#2390](https://github.com/whitphx/vscode-emacs-mcx/pull/2390).

## [0.88.5] - 2025-08-04

### Fix

- Internal refactoring of the `onDidChangeTextEditorSelection` handler, which maybe fixes unexpected cursor position changes, [#2388](https://github.com/whitphx/vscode-emacs-mcx/pull/2388).

## [0.88.4] - 2025-08-04

### Fix

- Internal refactoring around the `keepCursorInVisibleRange` config, [#2386](https://github.com/whitphx/vscode-emacs-mcx/pull/2386).

## [0.88.3] - 2025-08-03

### Fix

- Internal refactoring about the manner of argument passing, [#2379](https://github.com/whitphx/vscode-emacs-mcx/pull/2379) and [#2385](https://github.com/whitphx/vscode-emacs-mcx/pull/2385).
- Remove `emacs-mcx.digitArgument` and `emacs-mcx.subsequentArgumentDigit` from the `commands` contribution point as they don't make sense, [#2385](https://github.com/whitphx/vscode-emacs-mcx/pull/2385).

## [0.88.2] - 2025-08-03

### Fix

- Rename `emacs-mcx.yank-pop` to `emacs-mcx.yankPop` for consistency, [#2381](https://github.com/whitphx/vscode-emacs-mcx/pull/2381).

## [0.88.1] - 2025-08-03

### Fix

- `cmd+c` on search text input, [#2382](https://github.com/whitphx/vscode-emacs-mcx/pull/2382).

## [0.88.0] - 2025-08-03

### Fix

- `yank-pop` calls `yank-from-kill-ring` (same as `browse-kill-ring` in this extension) when the previous command was not a yank, [#2377](https://github.com/whitphx/vscode-emacs-mcx/pull/2377).

## [0.87.2] - 2025-08-03

### Fix

- `yank` and `yank-pop` accept prefix-argument, [#2376](https://github.com/whitphx/vscode-emacs-mcx/pull/2376).

## [0.87.1] - 2025-08-02

### Fix

- Fix a `yank` bug that duplicates text in the kill ring, [#2374](https://github.com/whitphx/vscode-emacs-mcx/pull/2374).

## [0.87.0] - 2025-08-02

### Add

- Add `browse-kill-ring`, [#2373](https://github.com/whitphx/vscode-emacs-mcx/pull/2373).

## [0.86.0] - 2025-08-01

### Add

- Add `scroll-other-window` and `scroll-other-window-down` commands, [#2368](https://github.com/whitphx/vscode-emacs-mcx/pull/2368).

## [0.85.2] - 2025-08-01

### Fix

- Fix `C-y` and `C-w` assignment, [#2371](https://github.com/whitphx/vscode-emacs-mcx/pull/2371).
- Fix `recenter-top-bottom`, [#2372](https://github.com/whitphx/vscode-emacs-mcx/pull/2372).

## [0.85.1] - 2025-08-01

### Fix

- Fix `scrollUpCommand` and `scrollDownCommand` to reveal the cursor when it's configured to behave like Emacs, [#2366](https://github.com/whitphx/vscode-emacs-mcx/pull/2366).
- Fix the `onDidChangeTextEditorVisibleRanges` handler for the `emacs-mcx.keepCursorInVisibleRange` config, [#2367](https://github.com/whitphx/vscode-emacs-mcx/pull/2367).

## [0.85.0] - 2025-07-31

### Change

- Refactoring internal keybinding definition, including adding platform-specific conditions to some commands, [#2363](https://github.com/whitphx/vscode-emacs-mcx/pull/2363).
- Revert default setting of `editor.find.seedSearchStringFromSelection` that was introduced in 0.80.0, [#2364](https://github.com/whitphx/vscode-emacs-mcx/pull/2364).

## [0.84.0] - 2025-07-31

### Add

- `M-c` to toggle case sensitivity in find widgets, [#2362](https://github.com/whitphx/vscode-emacs-mcx/pull/2362).

## [0.83.1] - 2025-07-31

### Fix

- Fix keybindings such as `[Tab]` -> `tab`, and merging conditions of `ctrl+g`, [#2361](https://github.com/whitphx/vscode-emacs-mcx/pull/2361).

## [0.83.0] - 2025-07-31

### Fix

- Internal keybinding generator updates, [#2360](https://github.com/whitphx/vscode-emacs-mcx/pull/2360)

### Add

- `C-M-i` and `M-TAB` for code completions, [#2358](https://github.com/whitphx/vscode-emacs-mcx/pull/2358).

## [0.82.0] - 2025-07-30

### Add

- Terminal keybindings, [#2356](https://github.com/whitphx/vscode-emacs-mcx/pull/2356).

## [0.81.0] - 2025-07-29

### Add

- Assign `editor.action.clipboard(Cut|Paste)Action` to `C-w` and `C-y` in more conditions, [#2353](https://github.com/whitphx/vscode-emacs-mcx/pull/2353).

## [0.80.2] - 2025-07-29

### Fix

- `moveEndOfLine` command now reveals the cursor, [#2351](https://github.com/whitphx/vscode-emacs-mcx/pull/2351).

## [0.80.1] - 2025-07-29

### Fix

- Disable `keepCursorInVisibleRange` in multi-cursor mode, [#2352](https://github.com/whitphx/vscode-emacs-mcx/pull/2352).

## [0.80.0] - 2025-07-29

### Change

- Deprecated `emacs-mcx.strictEmacsMove` config, [#2348](https://github.com/whitphx/vscode-emacs-mcx/pull/2348).

### Add

- Add `emacs-mcx.moveBeginningOfLineBehavior`, `emacs-mcx.moveEndOfLineBehavior`, `emacs-mcx.scrollUpCommandBehavior`, and `emacs-mcx.scrollDownCommandBehavior`, [#2348](https://github.com/whitphx/vscode-emacs-mcx/pull/2348).
- Set `editor.find.seedSearchStringFromSelection` as `"never"` via the `configurationDefaults` contribution, [#2349](https://github.com/whitphx/vscode-emacs-mcx/pull/2349).

## [0.79.0] - 2025-07-28

### Add

- Add `emacs-mcx.keepCursorInVisibleRange` config, [#2346](https://github.com/whitphx/vscode-emacs-mcx/pull/2346).

### Change

- Cursor behavior on scroll is based on `emacs-mcx.keepCursorInVisibleRange` instead of `emacs-mcx.strictEmacsMove`, [#2346](https://github.com/whitphx/vscode-emacs-mcx/pull/2346).

## [0.78.1] - 2025-07-27

### Fix

- Add test cases and modify the CI workflow, [#2345](https://github.com/whitphx/vscode-emacs-mcx/pull/2345).

## [0.78.0] - 2025-07-25

### Add

- `C-y` to paste from clipboard to the find widget, [#2342](https://github.com/whitphx/vscode-emacs-mcx/pull/2342).

## [0.77.1] - 2025-07-25

### Fix

- Fix the mark-mode to exit when "undo" or "redo" occurs, [#2341](https://github.com/whitphx/vscode-emacs-mcx/pull/2341).

## [0.77.0] - 2025-07-25

### Add

- `M-?` as xref-find-references, [#2340](https://github.com/whitphx/vscode-emacs-mcx/pull/2340).

## [0.76.0] - 2025-07-25

### Change

- Assign `C-g` to almost all commands that are originally assigned to `escape` so that `C-g` works as a cancel key in a wider range of cases, [#2332](https://github.com/whitphx/vscode-emacs-mcx/pull/2332).

## [0.75.0] - 2025-07-24

### Add

- Add `emacs-mcx.useMetaPrefixAlt` config, [#2338](https://github.com/whitphx/vscode-emacs-mcx/pull/2338).

## [0.74.0] - 2025-07-14

### Change

- Enable `alt` as meta always restoring the behavior of `<0.73.0`, [#2320](https://github.com/whitphx/vscode-emacs-mcx/pull/2320).

## [0.73.0] - 2025-07-12

### Change

- Overhaul the keybinding generator to make `isearchExit` behave more usefully, [#2307](https://github.com/whitphx/vscode-emacs-mcx/pull/2307).

## [0.72.0] - 2025-07-08

### Add

- Assign arrow-up/down alongside `C-p`/`C-n` for widget navigation, [#2305](https://github.com/whitphx/vscode-emacs-mcx/pull/2305)

## [0.71.0] - 2025-07-07

### Add

- Support Workspace Trust, [#2303](https://github.com/whitphx/vscode-emacs-mcx/pull/2303).

## [0.70.0] - 2025-07-07

### Change

- Assign `C-p` and `C-n` for up/down navigation in various widgets and remove invalid command assignments, [#2302](https://github.com/whitphx/vscode-emacs-mcx/pull/2302)

## [0.69.1] - 2025-07-07

### Fix

- Remove floating promises, [#2300](https://github.com/whitphx/vscode-emacs-mcx/pull/2300).

## [0.69.0] - 2025-07-07

### Add

- `goto-line` accepts a prefix argument to jump to the specified line number, [#2299](https://github.com/whitphx/vscode-emacs-mcx/pull/2299).

## [0.68.0] - 2025-07-07

### Add

- New `goto-line` command integrated with mark-mode, [#2297](https://github.com/whitphx/vscode-emacs-mcx/pull/2297).
- New `find-definitions` command integrated with mark-mode, [#2298](https://github.com/whitphx/vscode-emacs-mcx/pull/2298).

## [0.67.0] - 2025-07-07

### Add

- `C-p` and `C-n` for list navigation, [#2294](https://github.com/whitphx/vscode-emacs-mcx/pull/2294).
- `move-to-window-line-top-bottom`, [#2295](https://github.com/whitphx/vscode-emacs-mcx/pull/2295).

## [0.66.1] - 2025-07-06

### Fix

- Remove `C-x` conflicts in the terminal, [#2290](https://github.com/whitphx/vscode-emacs-mcx/pull/2290).

## [0.66.0] - 2025-07-04

### Add

- Code jump commands (xref-find-definitions, xref-go-back, xref-go-forward), [#2289](https://github.com/whitphx/vscode-emacs-mcx/pull/2289).

## [0.65.2] - 2025-07-04

### Fix

- Internal refactoring and package updates.

## [0.65.1] - 2025-01-29

### Fix

- Internal refactoring and package updates.

## [0.65.0] - 2025-01-08

### Change

- Remove the `pre*` prefix from the register command names, [#2152](https://github.com/whitphx/vscode-emacs-mcx/pull/2152).

## [0.64.0] - 2025-01-06

### Add

- `point-to-register` and `jump-to-register`, [#2150](https://github.com/whitphx/vscode-emacs-mcx/pull/2150).

## [0.63.0] - 2025-01-03

### Add

- `copy-rectangle-to-register`, [#2142](https://github.com/whitphx/vscode-emacs-mcx/pull/2142).

## [0.62.6] - 2025-01-03

### Fix

- Refactoring the text register commands, [#2140](https://github.com/whitphx/vscode-emacs-mcx/pull/2140).
- Fix the internal context name to manage the `C-x r -` command sequence state, [#2140](https://github.com/whitphx/vscode-emacs-mcx/pull/2140).
- Fix `copyToRegister` to deactivate mark-mode and selections, [#2140](https://github.com/whitphx/vscode-emacs-mcx/pull/2140).

## [0.62.5] - 2024-12-17

### Fix

- Cursor position adjustment in the `strictEmacsMove` mode when there are folded regions, #2131.

## [0.62.4] - 2024-12-11

### Fix

- Cursor position adjustment in the `strictEmacsMove` mode, #2123.

## [0.62.3] - 2024-11-29

### Fix

- Keep the cursor in the `strictEmacsMove` mode, #2011, by @zpencer.

## [0.62.2] - 2024-11-29

### Fix

- Internal package updates.

## [0.62.1] - 2024-11-28

### Fix

- Exclude unnecessary files from the VSIX package, #2106.
- Internal package updates.

## [0.62.0] - 2024-11-27

### Add

- `balance-windows`, #2080, by @ramnes.

### Fix

- Internal package updates.

## [0.61.2] - 2024-06-13

### Fix

- Internal package updates.

## [0.61.1] - 2024-05-20

### Fix

- Modify `M-s o` and `C-i` keybindings, #1916.
- Internal package updates.

## [0.61.0] - 2024-05-17

### Add

- Assign `M-s o` to the Quick Search command, which is like Emacs' occur, #1912.

### Fix

- The package description, #1913.

## [0.60.1] - 2024-05-17

### Fix

- Delete invalid keybindings, #1911.

## [0.60.0] - 2024-05-17

### Changed

- `tabToTabStop` behavior in offside-rule languages such as Python is changed to be more like the original Emacs, #1911.

## [0.59.2]

### Fix

- Cursor position maintenance, #1889.

## [0.59.1]

Skipped.

## [0.59.0]

Skipped.

## [0.58.0] - 2024-01-19

### Fix

- Fix the behavior of `killLine` and `killRegion` in the rect-mode, #1817.

## [0.57.2] - 2024-01-16

### Fix

- Internal fix on the event handler interrupting the appending kills, #1818

## [0.57.1] - 2024-01-13

### Fix

- Kill commands cancel the mark-mode and the rectangle-mark-mode, #1816

## [0.57.0] - 2024-01-13

### Fix

- Rename text register commands and refactor their implementations, #1815

## [0.56.0] - 2024-01-13

### Add

- `delete-horizontal-space`, #1812.

## [0.55.0] - 2024-01-11

### Add

- `emacs-mcx.paredit.parentheses` setting to configure parentheses characters, #1802.

## [0.54.1] - 2023-11-13

### Fix

- Revert the change in `0.54.0`, #1768.

## [0.54.0] - 2023-11-13

### Fix

- Override the default value of `editor.find.seedSearchStringFromSelection` to `"never"` to make the behavior of `C-s` and `C-r` consistent with the original Emacs, #1766.

## [0.53.0] - 2023-11-12

### Add

- `emacs-mcx.lineMoveVisual`, #1761, by @DrScKAWAMOTO.

## [0.52.1] - 2023-11-07

### Fix

- Refactoring, #1750, #1751.
- Command handlers return promises, #1753.

## [0.52.0] - 2023-11-06

### Removed

- `emacs-mcx.executeCommands` is removed. Use the [built-in `runCommands`](https://code.visualstudio.com/docs/getstarted/keybindings#_running-multiple-commands) instead which has been available since VSCode 1.77, #1749.

### Fix

- Implement `delete-indentation` as a command, #1748.

## [0.51.2] - 2023-11-06

### Fix

- `isearch-exit` behavior keeping the mark-mode selections, #1745.
- Refactoring, #1744, #1746.

## [0.51.1] - 2023-11-05

### Fix

- Remove an unnecessary file from the VSIX package, #1738
- Refactoring, #1742, #1743

## [0.51.0] - 2023-11-05

### Add

- Emacs-like tab, #1735.

### Fix

- `C-m` (new-line) with a prefix argument pushes a single edit history, #1733.

## [0.50.4] - 2023-11-03

### Fix

- Set the activation event as "onStartupFinished", #1720.

## [0.50.3] - 2023-11-03

Skipped due to an error.

## [0.50.2] - 2023-10-31

### Fix

- Stop revealing the cursor when switching text editors, #1721.
- Stop cursor position modification at switching text editors if the text editor is newly opened, #1722.

## [0.50.1] - 2023-09-15

### Fix

- Bugfix for text registers k, y, d, o, c, t, and p not working, #1679.

## [0.50.0] - 2023-09-15

### Add

- Text registers, #1643, by @justinhopkins.
- Assign `C-s` and `C-r` to `notebook.find`, #1659.

## [0.49.1 (pre-release)] - 2023-09-08

### Fix

- The editor switcher waits for selection updates triggered by other functions such as the code jump before synchronizing its own cursor positions so that it doesn't conflict with such other features, #1661.

## [0.49.0 (pre-release)] - 2023-08-28

### Change

- Share the mark-mode state and the mark anchor positions among all the editors on the same document, #1648.

## [0.48.6 (pre-release)] - 2023-08-28

Experimental pre-release.

## [0.48.5] - 2023-08-28

Skipped due to an error.

## [0.48.4] - 2023-08-16

### Fix

- Internal updates.

## [0.48.3] - 2023-08-16

### Fix

- Internal updates.

## [0.48.2]

Skipped due to an error.

## [0.48.1] - 2023-08-14

### Fix

- Keybindings JSON generator, #1622.

## [0.48.0] - 2023-08-14

### Add

- `paredit-kill`, #1425, by @dandavison.

### Fix

- Paste command when there is no entry in the kill ring, #1612.

## [0.47.0] - 2022-11-25

### Add

- Assign `(C|M)-<right>` and `(C|M)-<left>` to `forwardWord` and `backwardWord` in place of `right-word` and `left-word` which work like `forward-word` and `backward-word` in left-to-right languages (ref: https://www.gnu.org/software/emacs/manual/html_node/emacs/Moving-Point.html#index-C_002dRIGHT), #1479.
- Assign `C-<down>` and `C-<up>` to `forwardParagraph` and `backwardParagraph`, #1479.

## [0.46.0] - 2022-11-18

### Fix

- `scrollUpCommand` and `scrollDownCommand` with a prefix argument works in the same manner as the original Emacs, #1471.

## [0.45.2] - 2022-11-17

### Fix

- Remove unnecessary files from the vsix package, #1458.

## [0.45.1] - 2022-11-15

### Fix

- Manage different editor states for different cells in a single Jupyter notebook, #1455.

## [0.45.0] - 2022-11-14

### Add

- Show the extension commands in the command palette, #550, by @clearfeld.

### Fix

- Internal package updates.

## [0.44.1] - 2022-08-28

### Fix

- `recenterTopBottom` ignores the anchor cursor, #1396.

## [0.44.0] - 2022-05-01

### Add

- Automatically reload the configuration when changed, #1311.

### Fix

- Dispose unused resources, #1307, #1309.
- Find methods automatically reload the `editor.find.seedSearchStringFromSelection` config when changed, #1310.
- Set noop command to `C-g` with `sideBarFocus` context, #1314.

## [0.43.1] - 2022-04-29

### Fix

- Fix find commands to respect the `editor.find.seedSearchStringFromSelection` config, #1305.

## [0.43.0] - 2022-04-29

### Fix

- Internal fix, #1277, #1298, #1304.
- Set the required VSCode version as `^1.63.0`, #1303.

## [0.42.0] - 2022-04-28

### Add

- next/previous buffer by @loadx, #1292.

## [0.41.2] - 2022-03-26

### Fix

- An error on `isearch-exit`, #1272.
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
- `C-p` and `C-n` are fixed to work as cursor movement when intellisense is visible the number of whose items is just one.

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

- Behaviors of `C-f` (forward-char) and `C-b` (backward-char) are modified to move cursors over multiple lines when prefix argument specified.

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

- New kill-ring and yank implementation to append continuous invocation of `C-k` (kill-line) (#26).
- Add sexp functionalities by importing [`haruhi-s.sexp`](https://marketplace.visualstudio.com/items?itemName=haruhi-s.sexp) (#27).

## [0.1.1] - 2019-01-12

### Added

- New keybinding `ESC` for cancel (`quit`) (#30).
- New keybinding `M-g M-g` for `goto-line` (#24).
- New keybinding `M-g M-n` and `M-g M-p` for `next-error` and `previous-error` respectively (#25).
- New keybinding `C-o` for `open-line` (#28).
- Improve mark-mode behavior with `C-M-n` (#29).
