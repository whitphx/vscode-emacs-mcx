# Awesome Emacs Keymap (emacs-mcx)

[![Build Status](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_apis/build/status/tuttieee.vscode-emacs-mcx?branchName=master)](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_build/latest?definitionId=1?branchName=master)

This Visual Studio Code extension provides emacs-like keybindings and operations.
This is inspired by [the great vscode extension by hiro-sun](https://github.com/hiro-sun/vscode-emacs) and its forks such as [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly), [vscode-emacs-improved by rkwan94](https://github.com/rkwan94/vscode-emacs) and [vscode-emacs-neon by NotKyon](https://github.com/NotKyon/vscode-emacs-neon).

Though there were such great extensions, this extension is written from scratch because it was hard to achieve the goal listed below by extending the existent code base.

This extension aims
* to provide emacs-like keybindings
* to be fully compatible with multi cursor
* to support kill-ring integrated with the system clipboard
* to fix some bugs in the existing extensions such as
    * mark-mode states are shared amoung all editors

This extension makes use of code in the existent extensions listed above and, in addition, [VSCode Vim extension](https://github.com/VSCodeVim/Vim). Thanks to all these great works.
Mainly, almost all keybinding settings are derived from [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly).

### Move commands
|Command | Desc |
|--------|------|
| `C-f` | Move forward |
| `C-b` | Move backward |
| `C-n` | Move to the next line |
| `C-p` | Move to the previous line |
| `C-a` | Move to the beginning of line |
| `C-e` | Move to the end of line |
| `M-f` | Move forward by one word unit |
| `M-b` | Move backward by one word unit |
| `C-v` | Scroll down by one screen unit |
| `M-v` | Scroll up by one screen unit |
| `M-g g` (`M-g M-g`) | Jump to line (command palette) |
| `M-g n` (`M-g M-n`, ``C-x ` ``) | Jump to next error |
| `M-g p` (`M-g M-p`) | Jump to previous error |
| `C-l` | Center screen on current line (recenter-top-bottom) |


### Search Commands
|Command | Desc |
|--------|------|
| `C-s` | Search forward |
| `C-r` | Search backward |
| `M-S-5` (`M-%` with US keyboard) | Replace |
| `C-Enter` | Replace One Match (In replace dialog) |
| `C-M-n` | Add selection to next find match (Tips: This extension also provides `emacs-mcx.addSelectionToNextFindMatch` command so that you can register its keybinding by yourself if you want.) |


### Edit commands
|Command | Desc |
|--------|------|
| `C-d` | Delete right (DEL) |
| `C-h` | Delete left (BACKSPACE) |
| `M-d` | Delete word |
| `M-Bksp` | Delete word left |
| `C-k` | Kill from the current cursor to the end of line (kill-line) |
| `C-S-Bksp` | Kill whole line (kill-whole-line) |
| `C-w` | Kill region |
| `M-w` | Copy region to kill ring |
| `C-y` | Yank |
| `M-y` | Yank pop |
| `C-o` | Open line |
| `C-j` | New line |
| `C-m` | New line |
| `C-x C-o` | Delete blank lines around __(Under development)__ |
| `C-x h` | Select All |
| `C-x u` (`C-/`)| Undo |
| `C-;` | Toggle line comment in and out |
| `M-;` | Toggle region comment in and out |
| `C-x C-l` (`M-l`) | Convert to lower case (On Emacs' original behavior, `C-x C-l` and `M-l` are assigned to different functionalities. However, this extension assigns those to the same `editor.action.transformToLowercase` command which works similarly to both commands. Upper case (below) is same) |
| `C-x C-u` (`M-u`) | Convert to upper case |

### Other Commands
|Command | Desc |
|--------|------|
| `C-g` | Cancel |
| `C-space` | Set mark |
| `C-quote` | IntelliSense Suggestion |
| `M-x` | Open command palette |
| `C-M-SPC` | Toggle SideBar visibility |
| `C-x z` | Toggle Zen Mode |

### File Commands
|Command | Desc |
|--------|------|
| `C-x C-s` | Save |
| `C-x C-w` | Save as |
| `C-x C-n` | Open new window |

### Tab / Buffer Manipulation Commands
|Command | Desc |
|--------|------|
| `C-x b` | Switch to another open buffer |
| `C-x C-f` | QuickOpen a file |
| `C-x k` | Close current tab (buffer) |
| `C-x C-k` | Close all tabs |
| `C-x 0` | Close editors in the current group.  |
| `C-x 1` | Close editors in other (split) group.  |
| `C-x 2` | Split editor horizontal |
| `C-x 3` | Split editor vertical |
| `C-x 4` | Toggle split layout (vertical to horizontal) |
| `C-x o` | Focus other split editor |

### sexp
|Command | Desc |
|--------|------|
| `C-M-f` (`Alt+K`) | Move forward by one s-exp |
| `C-M-b` (`Alt+J`) | Move backward by one s-exp |
| `C-M-SPC` (`Alt+I`) | Slurp one s-exp forward |
| `C-M-S-SPC` (`Alt+U`) | Barf one s-exp to the front |

These sexp functionalities are provided [sexp](https://marketplace.visualstudio.com/items?itemName=haruhi-s.sexp) extension by **haruhi-s**.
Thanks to haruhi-s.
[sexp](https://marketplace.visualstudio.com/items?itemName=haruhi-s.sexp) is declared as an Awesome Emacs Keymap's dependency so that it is also installed together.

## Conflicts with default key bindings
- `ctrl+d`: editor.action.addSelectionToNextFindMatch => **Use `ctrl+alt+n` instead**;
- `ctrl+g`: workbench.action.gotoLine => **Use `alt+g g` instead**;
- `ctrl+b`: workbench.action.toggleSidebarVisibility => **Use `ctrl+alt+space` instead**;
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
