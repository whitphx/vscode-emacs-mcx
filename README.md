# Awesome Emacs Keymap (emacs-mcx)

[![Build Status](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_apis/build/status/tuttieee.vscode-emacs-mcx?branchName=master)](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_build/latest?definitionId=1?branchName=master)

This Visual Studio Code extension provides emacs-like keybindings and operations.
This is inspired by [the great vscode extension by hiro-sun](https://github.com/hiro-sun/vscode-emacs) and its forks such as [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly), [vscode-emacs-improved by rkwan94](https://github.com/rkwan94/vscode-emacs) and [vscode-emacs-neon by NotKyon](https://github.com/NotKyon/vscode-emacs-neon).

Though there were such great extensions, this extension is written from scratch because it was hard to achieve the goal listed below by extending the existent code base.

This extension aims
* to provide emacs-like keybindings
* to be fully compatible with multi cursor
* to support kill-ring integrated with the system clipboard
* to support prefix argument
* to support sexp
* to fix some bugs in the existing extensions such as
    * mark-mode states are shared amoung all editors

This extension makes use of code in the existent extensions listed above and, in addition, [VSCode Vim extension](https://github.com/VSCodeVim/Vim). Thanks to all these great works.
Mainly, almost all keybinding settings are derived from [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly).

## Configs
This extension has some custom settings named with a prefix `emacs-mcx`.
You can configure those settings.
(See [this page](https://code.visualstudio.com/docs/getstarted/settings#_settings-editor) to know how to change the settings.)

Configurable options of this extension are the followings.

### `emacs-mcx.strictEmacsMove`
If set to true, the original emacs's cursor movements are strictly simulated.
If set to false, the VSCode's native cursor movements are preserved.
For example, if set to true, when you type `C-a`, the cursor moves to the beginning of the line (Emacs' original behavior).
If set to false, on the other hand, the cursor move to the first non-empty character in the line (VSCode's native behavior of Home key).

### `emacs-mcx.useMetaPrefixEscape`
If set to true, Escape key works as the Meta prefix like original emacs.
If set to false, Escape key works as cancel, the VSCode's native behavior.
For example, if set to true, `M-f` (forward-word) can be issued by both `alt+f` and `escape f`.

The only exception is the commands which begin with `M-g` (`M-g g`, `M-g n`, `M-g p`).
It is because VSCode can handle only up to two key strokes as the key bindings.
So, as the special case, `Escape g` works as follows.

|Command | Desc |
|--------|------|
| `Escape g` | Jump to line (command palette) |

### `emacs-mcx.useMetaPrefixMacCmd`
If set to true, Command (⌘) key works as the Meta prefix like original emacs on macOS.
This option only works on macOS.

### `emacs-mcx.killRingMax`
Configures the maximum number of kill ring entries.
The default is 60.

### `emacs-mcx.killWholeLine`
This simulates the original Emacs' [`kill-whole-line` variable](https://www.gnu.org/software/emacs/manual/html_node/emacs/Killing-by-Lines.html).
The default is false.

### `emacs-mcx.debug.*`
Configurations for debugging.

## 'when' clause context
This extension provides mark-mode functionality and
you can use `emacs-mcx.inMarkMode` in `when` clause of your keybinding settings
in order to check whether or not mark-mode is enabled.

## Keymaps
Alt key is mapped to a meta prefix (`M`) by default though you can change it to Escape or Command key (macOS only) by the settings above.

### Move commands
|Command |Prefix argument |Desc |
|--------|----------------|------|
| `C-f` | ✓ | Move forward (forward-char) |
| `C-b` | ✓ | Move backward (backward-char) |
| `C-n` | ✓ | Move to the next line (next-line) |
| `C-p` | ✓ | Move to the previous line (previous-line) |
| `C-a` | ✓ | Move to the beginning of line (move-beginning-of-line) |
| `C-e` | ✓ | Move to the end of line (move-end-of-line) |
| `M-f` | ✓ | Move forward by one word unit (forward-word) |
| `M-b` | ✓ | Move backward by one word unit (backward-word) |
| `C-v` | ✓ | Scroll down by one screen unit (scroll-up-command) |
| `M-v` | ✓ | Scroll up by one screen unit (scroll-down-command) |
| `M-S-[` (`M-{` with US keyboard) | ✓ | Move back to previous paragraph beginning (backward-paragraph) |
| `M-S-]` (`M-}` with US keyboard) | ✓ | Move forward to next paragraph end (forward-paragraph) |
| `M-S-,` (`M-<` with US keyboard) | ✓ | Move to the top of the buffer (beginning-of-buffer) |
| `M-S-.` (`M->` with US keyboard) | ✓ | Move to the end of the buffer (end-of-buffer) |
| `M-g g` (`M-g M-g`) | | Jump to line (command palette) |
| `M-g n` (`M-g M-n`, ``C-x ` ``) | | Jump to next error |
| `M-g p` (`M-g M-p`) | | Jump to previous error |
| `C-l` | | Center screen on current line (recenter-top-bottom) |

### Search Commands
|Command | Desc |
|--------|------|
| `C-s` | Search forward |
| `C-r` | Search backward |
| `M-S-5` (`M-%` with US keyboard) | Replace |
| `C-M-n` | Add selection to next find match |
| `C-M-p` | Add selection to previous find match |

### Edit commands
|Command |Prefix argument | Desc |
|--------|----------------|------|
| `C-d` | ✓ | Delete right (DEL) |
| `C-h` | ✓ | Delete left (BACKSPACE) |
| `M-d` | ✓ | Kill word (kill-word) |
| `M-Bksp` | ✓ | Kill word left (backward-kill-word) |
| `C-k` | ✓ | Kill from the current cursor to the end of line (kill-line) |
| `C-S-Bksp`   || Kill whole line (kill-whole-line) |
| `C-w` |  | Kill region |
| `M-w` |  | Copy region to kill ring |
| `C-y` |  | Yank |
| `M-y` |  | Yank pop |
| `C-o` |  | Open line |
| `C-j` | ✓ | New line |
| `C-m` | ✓ | New line |
| `C-x C-o` |  | Delete blank lines around (delete-blank-lines) |
| `C-x h` |  | Select All |
| `C-x u` (`C-/`)|  | Undo |
| `C-;` |  | Toggle line comment in and out |
| `M-;` |  | Toggle region comment in and out |
| `C-x C-l` (`M-l`) |  | Convert to lower case (On the Emacs' original behavior, `C-x C-l` and `M-l` are assigned to the different functionalities. However, this extension assigns these keys to the same `emacs-mcx.transformToLowercase` command which calls `editor.action.transformToLowercase` command internally and works similarly to both the original Emacs' functionalities based on the context. Upper case and title case (below) are same) |
| `C-x C-u` (`M-u`) |  | Convert to upper case |
| `M-c` |  | Convert to title case |
| `M-S-6` (`M-^` with US keyboard) |  | Merge the previous and the current line (delete-indentation) |

### Other Commands
|Command | Desc |
|--------|------|
| `C-g` (`ESC`) | Cancel |
| `C-space` | Set mark |
| `C-quote` | IntelliSense Suggestion |
| `M-x` | Open command palette |
| `C-M-SPC` | Toggle SideBar visibility |
| `C-x z` | Toggle Zen Mode |

### File Commands
|Command | Desc |
|--------|------|
| `C-x C-f` | QuickOpen a file |
| `C-x C-s` | Save |
| `C-x C-w` | Save as |
| `C-x C-n` | Open new window |

### Tab / Buffer Manipulation Commands
|Command | Desc |
|--------|------|
| `C-x b` | Switch to another open buffer |
| `C-x k` | Close current tab (buffer) |
| `C-x C-k` | Close all tabs |
| `C-x 0` | Close editors in the current group.  |
| `C-x 1` | Close editors in other (split) group.  |
| `C-x 2` | Split editor horizontal |
| `C-x 3` | Split editor vertical |
| `C-x 4` | Toggle split layout (vertical to horizontal) |
| `C-x o` | Focus other split editor |

### Prefix argument
|Command | Desc |
|--------|------|
| `C-u` | universal-argument (See https://www.gnu.org/software/emacs/manual/html_node/emacs/Arguments.html for detail) |

### sexp
|Command |Prefix argument | Desc |
|--------|----------------|------|
| `C-M-f` | ✓ | Move forward by one s-exp |
| `C-M-b` | ✓ | Move backward by one s-exp |

This extension makes use of [paredit.js](https://github.com/rksm/paredit.js) to provide sexp functionalities. Thank you for this great library.

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
