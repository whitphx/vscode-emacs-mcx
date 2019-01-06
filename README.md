# emacs-mcx

[![Build Status](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_apis/build/status/tuttieee.vscode-emacs-mcx?branchName=master)](https://dev.azure.com/tyicyt/vscode-emacs-mcx/_build/latest?definitionId=1?branchName=master)

This Visual Studio Code extension provides emacs-like keybindings and operations.
This is inspired by [the great vscode extension by hiro-sun](https://github.com/hiro-sun/vscode-emacs) and its forks such as [vscode-emacs-friendly by Sebastian Zaha](https://github.com/SebastianZaha/vscode-emacs-friendly), [vscode-emacs-improved by rkwan94](https://github.com/rkwan94/vscode-emacs) and [vscode-emacs-neon by NotKyon](https://github.com/NotKyon/vscode-emacs-neon).

Though there were such great extensions, this extension is written from scratch because it was hard to achieve the goal listed below by extending the existent code base.

This extension aims
* to provide emacs-like keybindings
* to be fully compatible with multi cursor
* to support kill-ring integrated with the system clipboard __(Under development)__
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
| `M->` | #Move to the end of buffer |
| `M-<` | #Move to the beginning of buffer |
| `C-v` | Scroll down by one screen unit |
| `M-v` | Scroll up by one screen unit |
| `M-g g` | Jump to line (command palette) |
| `M-g n` | Jump to next error |
| `M-g p` | Jump to previous error |
| `C-l` | Center screen on current line __(Under development)__ |


### Search Commands
|Command | Desc |
|--------|------|
| `C-s` | Search forward |
| `C-r` | Search backward |
| `M-S-5` (`M-%` with US keyboard) | Replace |
| `C-Enter` | Replace One Match (In replace dialog) |
| `C-M-n` | Add selection to next find match |


### Edit commands
|Command | Desc |
|--------|------|
| `C-d` | Delete right (DEL) |
| `C-h` | Delete left (BACKSPACE) |
| `M-d` | Delete word |
| `M-Bksp` | Delete word left |
| `C-k` | Kill from the current cursor to the end of line (kill-line) |
| `C-S-Bksp` | Kill whole line (kill-whole-line)  __(Under development)__  |
| `C-w` | Kill region |
| `M-w` | Copy region to kill ring |
| `C-y` | Yank |
| `C-j` | Enter __(Under development)__ |
| `C-m` | Enter __(Under development)__ |
| `C-x C-o` | Delete blank lines around __(Under development)__ |
| `C-x h` | Select All |
| `C-x u` (`C-/`)| Undo |
| `C-;` | Toggle line comment in and out |
| `M-;` | Toggle region comment in and out |
| `C-x C-l` | Convert to lower case |
| `C-x C-u` | Convert to upper case |

### Other Commands
|Command | Desc |
|--------|------|
| `C-g` | Cancel |
| `C-space` | Set mark |
| `C-quote` | IntelliSense Suggestion |
| `M-x` | Open command palette |
| `C-M-SPC` | Toggle SideBar visibility |
| `C-x z` | | Toggle Zen Mode |

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
