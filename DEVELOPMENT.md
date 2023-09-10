# Development of Awesome Emacs Keymap

## Unit test, linter, and CI

This repository has introduced linter (ESLint), code formatter (Prettier), and unit testing.

### Linter and code formatter

To format the source files with ESLint and Prettier, run the following commands.

```shell
$ yarn check:eslint
$ yarn check:prettier
```

The commands below do only coding style checks, without formatting. These commands are automatically executed during the CI.

```
$ yarn fix:eslint
$ yarn fix:prettier
```

### Unit tests

To run unit tests, open VSCode's debug sidebar and run "Extension Tests".

Hint: You can also launch a new VSCode window with the extension under development by "Launch Extension".

<video autoplay loop muted playsinline controls>
  <source src="https://code.visualstudio.com/api/working-with-extensions/testing-extension/debug.mp4" type="video/mp4">
</video>

See also https://code.visualstudio.com/docs/editor/debugging

### CI

CI runs coding style checks and unit tests (See also the `build` job defined in [`.github/workflows/main.yml`](.github/workflows/main.yml)).

Make sure that **the CI has passed all coding style checks and unit tests** before requesting PR reviews.

## Keybindings generation

Keybindings of a VSCode extension must be defined in its `contributes.keybindings` section in `package.json` as described in [the doc](https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings),
but you MUST NOT edit it directly in case of this extension.

Instead, to change the keybindings, you have to edit `keybindings.json` and run `yarn gen-keys` to generate the resultant keybinding definitions and update `package.json` with them.

After that, you have to commit the auto-updated `package.json` in addition to `keybindings.json`.
Please also edit the keybindings list in `README.md`.

In `keybindings.json`, you can use some extended syntax described below.

### `keys`, `whens`

You can define multiple `key` combinations and/or `when` conditions for one command.
It's useful to define keybindings like below.

```json
{
  "keys": ["right", "ctrl+f"],
  "command": "emacs-mcx.forwardChar",
  "whens": ["editorTextFocus", "terminalFocus"]
}
```

### `meta` key

You can use `"meta"` key in `key` and `keys` fields.
It is converted basically to `"alt"` key, in addition, `"cmd"`, `"ctrl+["` and `"escape"` keys.
Those keybindings except `"alt"` are generated with equivalent when-conditions like `"when": "config.emacs-mcx.useMetaPrefixEscape"`,
which allows users to switch the keys as meta keys through the config.

### Comments

You can write comments in `keybindings.json`.

### Update README.md

Please update [`README.md`](./README.md) about the keybinding you added/updated.

## How to add a new command

First you have to create a command class.
One command is implemented as one class extending `EmacsCommand` class.
See `src/commands/*.ts`.

After a new command class is implemented, it must be registered to `commandRegistry` in `EmacsEmulator` class, which is the central controller of this extension.
See `src/emulator.ts`.

Then, you have to register a new command exposed by the extension to trigger the emulator's command registered above.
See `src/extension.ts`.

Finally, bind the exposed command to key strokes.
It's typically done by editing `package.json` though, it's incorrect in this extension.
Edit `keybindings.json` and run `yarn gen-keys` instead as described above.
