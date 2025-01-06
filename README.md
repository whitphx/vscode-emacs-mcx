# Awesome Emacs Keymap (emacs-mcx)

[![Test, Build, and Publish](https://github.com/whitphx/vscode-emacs-mcx/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/whitphx/vscode-emacs-mcx/actions/workflows/main.yml)

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/tuttieee.emacs-mcx?label=Visual%20Studio%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx)
[![Visual Studio Marketplace Installs - Azure DevOps Extension](https://img.shields.io/visual-studio-marketplace/azure-devops/installs/total/tuttieee.emacs-mcx)](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/tuttieee.emacs-mcx)](https://marketplace.visualstudio.com/items?itemName=tuttieee.emacs-mcx&ssr=false#review-details)

[![Open VSX Version](https://img.shields.io/open-vsx/v/tuttieee/emacs-mcx)](https://open-vsx.org/extension/tuttieee/emacs-mcx)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/tuttieee/emacs-mcx)](https://open-vsx.org/extension/tuttieee/emacs-mcx)
[![Open VSX Rating](https://img.shields.io/open-vsx/rating/tuttieee/emacs-mcx)](https://open-vsx.org/extension/tuttieee/emacs-mcx/reviews)

<a href="https://ko-fi.com/D1D2ERWFG" target="_blank"><img src="https://storage.ko-fi.com/cdn/brandasset/kofi_button_red.png" alt="Support me on Ko-fi" width="180" ></a>

<a href="https://www.buymeacoffee.com/whitphx" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="180" height="50" ></a>

[![GitHub Sponsors](https://img.shields.io/github/sponsors/whitphx?label=Sponsor%20me%20on%20GitHub%20Sponsors&style=social)](https://github.com/sponsors/whitphx)

This Visual Studio Code extension provides Emacs-like keybindings and operations.
This is inspired by [the great VSCcode extension by hiro-sun](https://github.com/hiro-sun/vscode-emacs) and its forks such as [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly), [vscode-emacs-improved by rkwan94](https://github.com/rkwan94/vscode-emacs), and [vscode-emacs-neon by NotKyon](https://github.com/NotKyon/vscode-emacs-neon).

Though there were such great extensions, this extension is written from scratch because it was hard to achieve the goals listed below by extending the existing codebase.

This extension aims

- to provide Emacs-like keybindings
- to be fully compatible with multi cursor
- to support kill-ring integrated with the system clipboard
- to support mark-ring
- to support prefix argument
- to support sexp
- to fix some bugs in the existing extensions such as
  - mark-mode states are shared among all editors

This extension makes use of code in the existent extensions listed above and, in addition, [VSCode](https://github.com/microsoft/vscode) and [VSCode Vim extension](https://github.com/VSCodeVim/Vim). Thanks for all these great works.
Mainly, almost all keybinding settings are derived from [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly).

## FAQ

### The cursor cannot be moved on the find widget as the widget closes with movement keys.

It's an intended design that simulates the original Emacs' behavior.
You can disable it with `emacs-mcx.cursorMoveOnFindWidget` option described below.
See https://github.com/whitphx/vscode-emacs-mcx/issues/137 for the details about this topic.

### i-search (`C-s`) is initialized with the currently selected string and the previous search is removed.

This is VSCode's design that an extension cannot control.
To disable it, you should set `editor.find.seedSearchStringFromSelection` VSCode setting as `"never"`.
It makes the find widget work similarly to Emacs.

Refs:

- [The official doc about `editor.find.seedSearchStringFromSelection` setting](basics#_seed-search-string-from-selection)
- [The GitHub issue where we discuss about it](https://github.com/whitphx/vscode-emacs-mcx/issues/107)

### The extension has been broken!

Try the `Developer: Reinstall Extension...` command from the command palette to reinstall the extension. I fixed [a problem](https://github.com/whitphx/vscode-emacs-mcx/issues/1654) by this way somehow.

### I find a bug. I want a feature X to be implemented. I have a question.

Post a bug report or a feature request to [GitHub Issues](https://github.com/whitphx/vscode-emacs-mcx/issues).

## Extension settings

This extension has some custom settings named with a prefix `emacs-mcx`.
You can configure those settings.
(See [this page](https://code.visualstudio.com/docs/getstarted/settings#_settings-editor) to know how to change the settings.)

Configurable options of this extension are the followings.

### `emacs-mcx.strictEmacsMove`

If set as true, the original emacs's cursor movements are strictly simulated.
If set as false, the VSCode's native cursor movements are preserved.
For example, if set as true, when you type `C-a`, the cursor moves to the beginning of the line (Emacs' original behavior).
If set as false, on the other hand, the cursor move to the first non-empty character in the line (VSCode's native behavior of Home key).

### `emacs-mcx.emacsLikeTab`

If set as true, `tab` key works as the Emacs' `tab-to-tab-stop` command.

### `emacs-mcx.useMetaPrefixEscape`

If set as true, Escape key works as the Meta prefix like original Emacs.
If set as false, Escape key works as cancel, the VSCode's native behavior.
For example, if set as true, `M-f` (forward-word) can be issued by both `alt+f` and `escape f`.

The only exception is the commands which begin with `M-g` (`M-g g`, `M-g n`, `M-g p`).
It is because VSCode can handle only up to two key strokes as the key bindings.
So, as the special case, `Escape g` works as follows.

| Command    | Desc                           |
| ---------- | ------------------------------ |
| `Escape g` | Jump to line (command palette) |

### `emacs-mcx.useMetaPrefixCtrlLeftBracket`

If set as true, `ctrl+[` works as the Meta prefix like original Emacs.

### `emacs-mcx.useMetaPrefixMacCmd`

If set as true, Command (⌘) key works as the Meta prefix like original Emacs on macOS.
This option only works on macOS.

### `emacs-mcx.killRingMax`

Configures the maximum number of kill ring entries.
The default is 60.

### `emacs-mcx.killWholeLine`

This simulates the original Emacs' [`kill-whole-line` variable](https://www.gnu.org/software/emacs/manual/html_node/emacs/Killing-by-Lines.html).
The default is false.

### `emacs-mcx.cursorMoveOnFindWidget`

If set to true, cursor move commands of this extension (`C-f`, `C-b`, `C-p`, `C-n`, `C-a`, `C-e`, `M-f`, `M-b`, and `M-m`) are disabled when the find widget is focused, to allow the widget to keep open and the cursor to move on it.

### `emacs-mcx.enableOverridingTypeCommand`

Prefix arguments do not work on character inputs with IMEs by default and you can set this config to `true` in order to enable it.
Note that this config makes use of VSCode API's `type` command under the hood and can cause problems in some cases.

- If you are using IME, text input may sometimes fail.
- If another extension that also uses the `type` command is installed, an error occurs (See https://github.com/Microsoft/vscode/issues/13441).

### `emacs-mcx.enableDigitArgument`

Indicates whether `M-<digit>` (the `emacs-mcx.digitArgument` command) is enabled.
Set `false` when `M-<digit>` conflicts with some other necessary commands. See https://github.com/whitphx/vscode-emacs-mcx/issues/1208 for the background.

### `emacs-mcx.lineMoveVisual`

When true, line-move moves point by visual lines (same as an Emacs variable line-move-visual).

### `emacs-mcx.paredit.parentheses`

Key-value pairs of parentheses like the following example to be used in the ParEdit commands.

```json
{
  "[": "]",
  "(": ")",
  "{": "}"
}
```

### `emacs-mcx.debug.*`

Configurations for debugging.

## 'when' clause context

This extension provides some contexts that you can refer to in `"when"` clauses of your `keybindings.json`.

### `emacs-mcx.inMarkMode`

_boolean_

This indicates whether mark-mode is enabled.

### `emacs-mcx.acceptingArgument`

_boolean_

This indicates the editor is accepting argument input following `C-u`.

### `emacs-mcx.prefixArgumentExists` (experimental)

_boolean_

This indicates if a prefix argument exists.
Use this boolean context to check the existence of a prefix argument, instead of using `emacs-mcx.prefixArgument` with null check.

### `emacs-mcx.prefixArgument` (experimental)

_number | undefined_

This is a currently input prefix argument.

## Keymaps

Alt key is mapped to the Meta prefix (`M`) by default and you can configure for Escape, `ctrl+[`, or Command (⌘) key (macOS only) to work as it with the settings above.

### Move commands

| Command                                      | Prefix argument | Desc                                                                                                   |
| -------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `C-f`                                        | ✓               | Move forward (forward-char)                                                                            |
| `C-b`                                        | ✓               | Move backward (backward-char)                                                                          |
| `C-n`                                        | ✓               | Move to the next line (next-line)                                                                      |
| `C-p`                                        | ✓               | Move to the previous line (previous-line)                                                              |
| `C-a`                                        | ✓               | Move to the beginning of line (move-beginning-of-line)                                                 |
| `C-e`                                        | ✓               | Move to the end of line (move-end-of-line)                                                             |
| `M-f`                                        | ✓               | Move forward by one word unit (forward-word)                                                           |
| `M-b`                                        | ✓               | Move backward by one word unit (backward-word)                                                         |
| `C-<right>`, `M-<right>`                     | ✓               | This command (right-word) behaves like `M-f`                                                           |
| `C-<left>`, `M-<left>`                       | ✓               | This command (left-word) behaves like `M-b`                                                            |
| `M-m`                                        |                 | Move (forward or back) to the first non-whitespace character on the current line (back-to-indentation) |
| `C-v`                                        | ✓               | Scroll down by one screen unit (scroll-up-command)                                                     |
| `M-v`                                        | ✓               | Scroll up by one screen unit (scroll-down-command)                                                     |
| `M-S-[` (`M-{` with US keyboard), `C-<up>`   | ✓               | Move back to previous paragraph beginning (backward-paragraph)                                         |
| `M-S-]` (`M-}` with US keyboard), `C-<down>` | ✓               | Move forward to next paragraph end (forward-paragraph)                                                 |
| `M-S-,` (`M-<` with US keyboard)             |                 | Move to the top of the buffer (beginning-of-buffer)                                                    |
| `M-S-.` (`M->` with US keyboard)             |                 | Move to the end of the buffer (end-of-buffer)                                                          |
| `M-g g` (`M-g M-g`)                          |                 | Jump to line (command palette)                                                                         |
| `M-g n` (`M-g M-n`, ``C-x ` ``)              |                 | Jump to next error                                                                                     |
| `M-g p` (`M-g M-p`)                          |                 | Jump to previous error                                                                                 |
| `C-l`                                        |                 | Center screen on current line (recenter-top-bottom)                                                    |

### Search Commands

| Command                              | Desc                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `C-s`                                | Incremental search forward (isearch-forward).                                                                         |
| `C-r`                                | Incremental search backward (isearch-backward).                                                                       |
| `C-M-s`                              | Begin incremental regexp search (isearch-forward-regexp).                                                             |
| `C-M-r`                              | Begin reverse incremental regexp search (isearch-backward-regexp).                                                    |
| `M-S-5` (`M-%` with US keyboard)     | Replace (query-replace)                                                                                               |
| `C-M-S-5` (`C-M-%` with US keyboard) | Replace with regexp (query-replace-regexp)                                                                            |
| `C-M-n`                              | Add selection to next find match                                                                                      |
| `C-M-p`                              | Add selection to previous find match                                                                                  |
| `M-s o`                              | Open [Quick Search](https://code.visualstudio.com/updates/v1_89#_quick-search), which is like Emacs' `occur` command. |

### Edit commands

| Command                                          | Prefix argument | Desc                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C-d`                                            | ✓               | Delete right (DEL)                                                                                                                                                                                                                                                                                                                                                                                                               |
| `C-h`                                            | ✓               | Delete left (BACKSPACE)                                                                                                                                                                                                                                                                                                                                                                                                          |
| `M-\`                                            | ✓               | Delete spaces and tabs around point (delete-horizontal-space).                                                                                                                                                                                                                                                                                                                                                                   |
| `C-x C-o`                                        |                 | Delete blank lines around (delete-blank-lines)                                                                                                                                                                                                                                                                                                                                                                                   |
| `M-S-6` (`M-^` with US keyboard)                 |                 | join two lines cleanly (delete-indentation)                                                                                                                                                                                                                                                                                                                                                                                      |
| `M-d`                                            | ✓               | Kill word (kill-word)                                                                                                                                                                                                                                                                                                                                                                                                            |
| `M-Bksp`                                         | ✓               | Kill word left (backward-kill-word)                                                                                                                                                                                                                                                                                                                                                                                              |
| `C-k`                                            | ✓               | Kill from the current cursor to the end of line (kill-line)                                                                                                                                                                                                                                                                                                                                                                      |
| `C-S-Bksp`                                       |                 | Kill whole line (kill-whole-line)                                                                                                                                                                                                                                                                                                                                                                                                |
| `C-w`                                            |                 | Kill region                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `M-w`                                            |                 | Copy region to kill ring                                                                                                                                                                                                                                                                                                                                                                                                         |
| `C-y`                                            |                 | Yank                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `M-y`                                            |                 | Yank pop                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `C-o`                                            |                 | Open line                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `C-j`                                            | ✓               | New line                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `C-m`                                            | ✓               | New line                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `C-x h`                                          |                 | Select All                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `C-x u`, `C-/`, `C-S--` (`C-_` with US keyboard) |                 | Undo                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `C-;`                                            |                 | Toggle line comment in and out                                                                                                                                                                                                                                                                                                                                                                                                   |
| `M-;`                                            |                 | Toggle region comment in and out                                                                                                                                                                                                                                                                                                                                                                                                 |
| `C-x C-l` (`M-l`)                                |                 | Convert to lower case (On the Emacs' original behavior, `C-x C-l` and `M-l` are assigned to the different functionalities. However, this extension assigns these keys to the same `emacs-mcx.transformToLowercase` command which calls `editor.action.transformToLowercase` command internally and works similarly to both the original Emacs' functionalities based on the context. Upper case and title case (below) are same) |
| `C-x C-u` (`M-u`)                                |                 | Convert to upper case                                                                                                                                                                                                                                                                                                                                                                                                            |
| `M-c`                                            |                 | Convert to title case                                                                                                                                                                                                                                                                                                                                                                                                            |

## Mark Commands

| Command                                   | Desc                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `C-SPC`, `C-S-2` (`C-@` with US keyboard) | Set the mark at point, and activate it (set-mark-command).                                                   |
| `C-SPC C-SPC`                             | Set the mark, pushing it onto the mark ring, without activating it.                                          |
| `C-u C-SPC`                               | Move point to where the mark was, and restore the mark from the ring of former marks.                        |
| `C-x C-x`                                 | Set the mark at point, and activate it; then move point where the mark used to be (exchange-point-and-mark). |

See [this page](https://www.gnu.org/software/emacs/manual/html_node/emacs/Setting-Mark.html) and [this page](https://www.gnu.org/software/emacs/manual/html_node/emacs/Mark-Ring.html) about the mark and the mark ring.

## Text registers

| Command       | Desc                                              |
| ------------- | ------------------------------------------------- |
| `C-x r s `_r_ | Copy region into register _r_ (copy-to-register). |
| `C-x r i `_r_ | Insert text from register _r_ (insert-register).  |

See [this page](https://www.gnu.org/software/emacs/manual/html_node/emacs/Text-Registers.html) about the text registers.

## Position registers

| Command         | Desc                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------ |
| `C-x r SPC `_r_ | Record the position of point and the current buffer in register _r_ (`point-to-register`). |
| `C-x r j `_r_   | Jump to the position and buffer saved in register _r_ (`jump-to-register`).                |

## Rectangles

| Command     | Desc                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `C-x r k`   | Kill the text of the region-rectangle, saving its contents as the last killed rectangle (kill-rectangle). |
| `C-x r M-w` | Save the text of the region-rectangle as the last killed rectangle (copy-rectangle-as-kill).              |
| `C-x r d`   | Delete the text of the region-rectangle (delete-rectangle).                                               |
| `C-x r y`   | Yank the last killed rectangle with its upper left corner at point (yank-rectangle).                      |
| `C-x r p`   | Replace last kill ring to each line of rectangle if the kill ring top only contains one line.             |
| `C-x r o`   | Insert blank space to fill the space of the region-rectangle (open-rectangle).                            |
| `C-x r c`   | Clear the region-rectangle by replacing all of its contents with spaces (clear-rectangle).                |
| `C-x r t`   | Replace rectangle contents with string on each line (string-rectangle).                                   |
| `C-x SPC`   | Toggle Rectangle Mark mode (rectangle-mark-mode).                                                         |

### Rectangle Registers

| Command       | Desc                                                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `C-x r r `_r_ | Copy the region-rectangle into register _r_ (`copy-rectangle-to-register`). With prefix argument, delete it as well. |
| `C-x r i `_r_ | Insert the rectangle stored in register _r_ (if it contains a rectangle) (`insert-register`).                        |

### Other Commands

| Command       | Desc                                      |
| ------------- | ----------------------------------------- |
| `C-g` (`ESC`) | Cancel                                    |
| `C-'` (`M-/`) | IntelliSense Suggestion                   |
| `M-x`         | Open command palette                      |
| `C-M-SPC`     | Toggle SideBar visibility                 |
| `C-x z`       | Toggle Zen Mode                           |
| `C-x C-c`     | Close window (save-buffers-kill-terminal) |

### File Commands

| Command   | Desc                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `C-x C-f` | QuickOpen a file (Tips: This extension assigns `C-x C-f` to the VSCode's native [quick file navigation](https://code.visualstudio.com/docs/editor/editingevolved#_quick-file-navigation). If you prefer more Emacs-like behavior, [The "File Browser" extension by Bodil Stokke (`bodil.file-browser`)](https://marketplace.visualstudio.com/items?itemName=bodil.file-browser) may help.) |
| `C-x C-s` | Save                                                                                                                                                                                                                                                                                                                                                                                       |
| `C-x C-w` | Save as                                                                                                                                                                                                                                                                                                                                                                                    |
| `C-x s`   | Save all files                                                                                                                                                                                                                                                                                                                                                                             |
| `C-x C-n` | Open new window                                                                                                                                                                                                                                                                                                                                                                            |

### Tab / Buffer Manipulation Commands

| Command     | Desc                                         |
| ----------- | -------------------------------------------- |
| `C-x b`     | Switch to another open buffer                |
| `C-x k`     | Close current tab (buffer)                   |
| `C-x 0`     | Close editors in the current group.          |
| `C-x 1`     | Close editors in other (split) group.        |
| `C-x 2`     | Split editor horizontal                      |
| `C-x 3`     | Split editor vertical                        |
| `C-x 4`     | Toggle split layout (vertical to horizontal) |
| `C-x o`     | Focus other split editor                     |
| `C-x LEFT`  | Select the previous tab (previous-buffer).   |
| `C-x RIGHT` | Select the next tab (next-buffer).           |

### Prefix argument

See https://www.gnu.org/software/emacs/manual/html_node/emacs/Arguments.html for detail

| Command      | Desc               |
| ------------ | ------------------ |
| `C-u`        | universal-argument |
| `M-<number>` | digit-argument     |
| `M--`        | negative-argument  |

### sexp

| Command                              | Prefix argument | Desc                                                                                       |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------------------------ |
| `C-M-f`                              | ✓               | Move forward over a balanced expression (forward-sexp)                                     |
| `C-M-b`                              | ✓               | Move backward over a balanced expression (backward-sexp)                                   |
| `C-M-S-2` (`C-M-@` with US keyboard) | ✓               | Set mark after end of following balanced expression (mark-sexp). This does not move point. |
| `C-M-k`                              | ✓               | Kill balanced expression forward (kill-sexp)                                               |
| `C-M-Bksp`                           | ✓               | Kill balanced expression backward (backward-kill-sexp)                                     |
| `C-S-k`                              | ✓               | Kill a line as if with `kill-line`, but respecting delimiters. (paredit-kill)              |

This extension makes use of [paredit.js](https://github.com/rksm/paredit.js) to provide sexp functionalities. Thank you for this great library.

## Other commands

### `emacs-mcx.executeCommandWithPrefixArgument`

This command calls another command with the prefix argument.
This is mainly for extension developers who want to make the extensions collaborative with this extension's prefix argument. See [the issue #1146](https://github.com/whitphx/vscode-emacs-mcx/issues/1146) for the discussion about it.

For example, if you define the keybinding below,

- `C-x e` will call the command `foo` with the argument `{}`.
- `C-u C-x e` will call the command `foo` with the argument `{ prefixArgument: 4 }`.

```json
{
  "key": "ctrl+x e",
  "command": "emacs-mcx.executeCommandWithPrefixArgument",
  "args": {
    "command": "foo"
  }
}
```

You can pass the arguments to the target command as below. In this case,

- `C-x e` will call the command `foo` with the argument `{ baz: 42 }`.
- `C-u C-x e` will call the command `foo` with the argument `{ prefixArgument: 4, baz: 42 }`.

```json
{
  "key": "ctrl+x e",
  "command": "emacs-mcx.executeCommandWithPrefixArgument",
  "args": {
    "command": "foo",
    "args": {
      "baz": 42
    }
  }
}
```

You can change the key name of the prefix argument.

```json
{
  "key": "ctrl+x e",
  "command": "emacs-mcx.executeCommandWithPrefixArgument",
  "args": {
    "command": "foo",
    "prefixArgumentKey": "repeat"
  }
}
```

- `C-x e` will call the command `foo` with the argument `{}`.
- `C-u C-x e` will call the command `foo` with the argument `{ repeat: 4 }`.

## Conflicts with default key bindings

- `ctrl+d`: editor.action.addSelectionToNextFindMatch => **Use `ctrl+alt+n` instead**;
- `ctrl+g`: workbench.action.gotoLine => **Use `alt+g g` instead**;
- `ctrl+b`: workbench.action.toggleSidebarVisibility => **Use `ctrl+alt+space` instead**;
- `ctrl+j`: workbench.action.togglePanel => **Use `ctrl+x j` instead**;
- `ctrl+space`: toggleSuggestionDetails, editor.action.triggerSuggest => **Use `ctrl+'` instead**;
- `ctrl+x`: editor.action.clipboardCutAction => **Use `ctrl+w` instead**;
- `ctrl+v`: editor.action.clipboardPasteAction => **Use `ctrl+y` instead**;
- `ctrl+k`: editor.debug.action.showDebugHover, editor.action.trimTrailingWhitespace, editor.action.showHover, editor.action.removeCommentLine, editor.action.addCommentLine, editor.action.openDeclarationToTheSide;
- `ctrl+k z`: workbench.action.toggleZenMode => **Use `ctrl+x z` instead**;
- `ctrl+y`: redo;
- `ctrl+m`: editor.action.toggleTabFocusMode;
- `ctrl+/`: editor.action.commentLine => **Use `ctrl+;` instead**;
- `ctrl+p` & `ctrl+e`: workbench.action.quickOpen => **Use `ctrl+x b` instead**;
- `ctrl+p`: workbench.action.quickOpenNavigateNext => **Use `ctrl+n` instead**.
- `ctrl+o`: workbench.action.files.openFileFolder;

## Contributions/Development

Your contributions are very welcome!

Please see [DEVELOPMENT.md](./DEVELOPMENT.md) about development of this extension.
