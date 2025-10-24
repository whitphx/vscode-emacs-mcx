# Development of Awesome Emacs Keymap

## Setup

Install dependencies.

```shell
npm install
```

Open this repository in VSCode.

```shell
code .
```

Go to the "Run and Debug" side panel

- Run "Launch Extension" for testing the extension in VSCode, like https://code.visualstudio.com/api/get-started/your-first-extension#debugging-the-extension
- Run "Extension Tests" for running unit tests.
- "Run Web Extension in VS Code" and "Extension Tests in VS Code" are also available for web extension development.

https://code.visualstudio.com/docs/editor/debugging may help you.

## Unit test, linter, and CI

This repository has introduced linter (ESLint), code formatter (Prettier), and unit testing.

### Linter and code formatter

To format the source files with ESLint and Prettier, run the following commands.

```shell
$ npm run check:eslint
$ npm run check:prettier
```

The commands below do only coding style checks, without formatting. These commands are automatically executed during the CI.

```
$ npm run fix:eslint
$ npm run fix:prettier
```

### Unit tests

To run unit tests,

- open VSCode's debug sidebar and run "Extension Tests".
- or run `npm test` in the terminal.

### CI

CI runs coding style checks and unit tests (See also the `build` job defined in [`.github/workflows/main.yml`](.github/workflows/main.yml)).

Make sure that **the CI has passed all coding style checks and unit tests** before requesting PR reviews.

## Keybindings generation

Keybindings of a VSCode extension must be defined in its `contributes.keybindings` section in `package.json` as described in [the doc](https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings),
but you MUST NOT edit it directly in case of this extension.

Instead, to change the keybindings, you have to edit the JSON files in `keybindings` and run `npm run gen-keys` to generate the resultant keybinding definitions and update `package.json` with them.

After that, you have to commit the auto-updated `package.json` in addition to `keybindings/*.json`.
Please also edit the keybindings list in `README.md`.

In the JSON files, you can use some extended syntax described below.

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
A keybinding that had `"meta"` key will be converted to multiple keybindings with different actual meta keys, `"alt"`, `"cmd"`, `"ctrl+["` and `"escape"`.
Each keybinding will have a `when` condition like `"when": "config.emacs-mcx.useMetaPrefixEscape"` that allows users to turn on/off the meta key behavior through the config.

### `inheritWhenFromDefault`

If `inheritWhenFromDefault` is `true`, the `when` condition of its keybinding is copied from the VSCode's default keybinding that has the same `command`.
This is useful to define a new keybinding with an existing command, but with a different `key` or `keys`.

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
Edit `keybindings.json` and run `npm run gen-keys` instead as described above.

# Release the extension (only for maintainers)

```
$ vi CHANGELOG.md
$ ./scripts/new-version.sh <version>
$ git push origin main --tags
```
