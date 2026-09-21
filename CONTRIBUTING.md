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

## Add a changeset to your PR

When you submit a PR, please run `npm run changeset` locally to generate a changeset describing the changes made in the PR and add the generated file under `.changeset/` to the PR.
The changeset needs to have the version bump type (patch, minor, or major) and a description of the changes. Use `patch` for bug fixes and small changes, `minor` for new features that are backward-compatible, and `major` for breaking changes. (`major` won't be used before v1.0.0.)

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

It is strongly encouraged to add unit tests for the new command.

## Behavior alignment policy

When implementing a feature that emulates an Emacs command and VS Code already has an equivalent or similar behavior, prefer matching VS Code's default behavior so the extension feels native to VS Code users. It is encouraged to also offer an Emacs-like variant behind a configuration option; if added, default the option to the VS Code-like behavior.

Examples:

- Char motion selection: default to VS Code behavior (collapsing selections) with an opt-in flag for Emacs-like pre-clear selection (`emacs-mcx.clearSelectionBeforeCharMove`).
- Word navigation: default to VS Code word boundaries (`emacs-mcx.wordNavigationStyle = "vscode"`), with an option for Emacs-style word parsing.
- Line movement: default to VS Code line/indent behavior (`emacs-mcx.moveBeginningOfLineBehavior = "vscode"`, `emacs-mcx.moveEndOfLineBehavior = "vscode"`), with opt-in Emacs-like variants.

# Release the extension (only for maintainers)

Releases are now driven by [Changesets](https://github.com/changesets/changesets) and the automated workflow in `.github/workflows/changesets.yml`.

1. PRs must include a changeset (see above) to describe the changes made.
   - If the PR author forgets to add a changeset, maintainers can add it during review, or even if the PR is merged without changeset, maintainers can add it afterward on the main branch.
2. After the PR merges, the Changesets workflow automatically opens a "Version Packages" PR that bumps `package.json`, updates `CHANGELOG.md`, and removes consumed changesets. Review and merge it once it's ready to release.
3. Once the release PR is merged, the workflow automatically triggers the release process. It creates and pushes a new version tag `v<version>`, which triggers the "Test and Build" workflow followed by "Post-build". They build and publish the extension package to the Visual Studio Marketplace and Open VSX.

Only fall back to `scripts/new-version.sh` for emergency manual releases, and always ensure CI succeeded before cutting a tag.

## Marketplace publishing credentials

The "Post-build" workflow publishes to the Visual Studio Marketplace with a Microsoft Entra ID identity instead of a personal access token, because Azure DevOps retires global personal access tokens on December 1, 2026 (see [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) in the VS Code docs). The `publish-marketplace` job exchanges the GitHub Actions OIDC token for an Entra ID token with `azure/login`, and `vsce publish --azure-credential` publishes with that token. This is the one-time setup it relies on:

1. Register an application in [Microsoft Entra ID](https://entra.microsoft.com) and note its application (client) ID and directory (tenant) ID. An app registration lives in the tenant, so it needs no Azure subscription, unlike the managed identity the VS Code docs suggest.
2. Add a federated credential to it for the "GitHub Actions deploying Azure resources" scenario, with the organization `whitphx`, the repository `vscode-emacs-mcx`, the entity type `Environment`, and the environment name `marketplace`. That yields the subject `repo:whitphx/vscode-emacs-mcx:environment:marketplace` and the audience `api://AzureADTokenExchange`.
3. Add the identity as a member of the `tuttieee` publisher with the Contributor role on the [Marketplace publisher management page](https://marketplace.visualstudio.com/manage), identified there by its Azure DevOps profile ID.
4. Create a GitHub environment named `marketplace` in this repository and give it the secrets `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`. Leave its deployment branch policy unrestricted (or allow `main`), because the "Post-build" workflow runs in the default branch context even for tag releases.

Reading that profile ID means signing in as the identity, which needs a client secret. Create one under the app registration's Certificates & secrets, and delete it once the ID is in place, because CI authenticates through the federated credential instead. The `id` field of the response below is the value the publisher page wants:

```bash
az login --service-principal --username <client-id> --password <secret> --tenant <tenant-id> --allow-no-subscriptions
az rest --url https://app.vssps.visualstudio.com/_apis/profile/profiles/me --resource 499b84ac-1321-427f-aa17-267ca6975798
```

Signed in that way, `npm exec -- vsce verify-pat tuttieee --azure-credential` confirms the publisher membership from step 3. The federated credential and the GitHub environment are only exercised by a real release.

Open VSX is not affected; the `publish-openvsx` job keeps using the `OPEN_VSX_TOKEN` secret.
