# Awesome Emacs Keymap
## Development
### Unit test, linter, and CI
This repository has introduced linter (ESlint), code formatter (Prettier), and unit testing.

#### Linter
To run linter,
```
$ yarn lint
```

#### Formatter
To apply formatter,
```
$ yarn prettier
```

#### Unit tests
To run unit tests, open VSCode's debug sidebar and run "Extension Tests".

Hint: You can also launch a new VSCode window with the extension under development by "Launch Extension".

<video autoplay loop muted playsinline controls>
  <source src="/api/working-with-extensions/testing-extension/debug.mp4" type="video/mp4">
</video>

See also https://code.visualstudio.com/docs/editor/debugging

#### CI
CI runs coding style checks and unit tests (See also [`azure-pipelines.yml`](azure-pipelines.yml)).

Make sure that **CI has passed all coding style checks and unit tests** before requesting PR reviews.

### Keybindings generation
Keybindings of a VSCode extension must be defined in its `contributes.keybindings` section in `package.json` as described in [the doc](https://code.visualstudio.com/api/references/contribution-points#contributes.keybindings),
but you MUST NOT edit it directly.

Instead, to change keybindings, you have to edit `keybindings.json` and run `yarn gen-keys` to generate a resultant keybindings definition and update `package.json` with it.

In `keybindings.json`, you can use some extended syntax.

#### `keys`, `whens`
You can define multiple `key` combinations and/or `when` conditions for one command.
It's useful to define keybindings like below.
```json
{
  "keys": ["right", "ctrl+f"],
  "command": "emacs-mcx.forwardChar",
  "whens": ["editorTextFocus", "terminalFocus"]
}
```

#### `meta` key
You can use `"meta"` key in `key` and `keys` fields.
It is converted basically to `"alt"` key, in addition, `"cmd"` and `"escape"` keys.
Those `"cmd"` and `"escape"` keys are generated with `"when": "config.emacs-mcx.useMetaPrefixMacCmd"` and `"when": "config.emacs-mcx.useMetaPrefixEscape"` conditions respectively,
that enables users to switch the key to use as a meta key by the config.


#### Comments
You can write comments in `keybindings.json`.
