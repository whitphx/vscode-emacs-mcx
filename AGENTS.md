# Repository Guidelines

See `CONTRIBUTING.md` for the full contributor guide (setup, debugging in VS Code, lint/test commands, release flow); the notes below are a quick reference and may be out of date—if anything conflicts, defer to `CONTRIBUTING.md`.

## Project Structure & Module Organization

TypeScript sources live in `src/`, with `src/commands/` holding individual `EmacsCommand` subclasses, `src/emulator.ts` coordinating command dispatch, and `src/test/` hosting VS Code integration specs. Keybinding data stays in `keybindings/`, while the generator CLI in `keybinding-generator/` (see `cli.mts`) writes back into `package.json`. Bundler configs sit under `build/` and `webpack.config.js`, reusable scripts in `scripts/`, shipping assets in `images/`, and vendorized deps (such as `paredit.js`) in `vendor/`. Built artifacts land in `dist/` and should be regenerated rather than edited.

## Setup & Debugging

- Install dependencies with `npm install`, open the repo in VS Code, and use Run and Debug targets: "Launch Extension" and "Extension Tests" for desktop, plus "Run Web Extension in VS Code" / "Extension Tests in VS Code" for web. See `CONTRIBUTING.md` for the step-by-step workflow.

## Build, Test, and Development Commands

- `npm run webpack` / `npm run webpack:prod`: bundle the desktop extension in dev or production mode.
- `npm run compile-web`, `watch-web`, or `package-web`: build the web-targeted artifact defined in `build/web-extension.webpack.config.js`.
- `npm run check:eslint` / `npm run check:prettier`: lint/format checks (use `npm run fix:eslint` / `npm run fix:prettier` to autofix).
- `npm run gen-keys`: regenerate `contributes.keybindings` from the JSON templates.
- `npm run vscode:prepublish`: full release pipeline (install, clean `dist/`, generate keybindings, production bundles for desktop + web).

## Coding Style & Naming Conventions

Prettier (`.prettierrc`) and ESLint (`eslint.config.mjs`) are the single sources of truth—stick to 2-space indentation, trailing commas, and explicit semicolons they enforce. New commands should be named with descriptive PascalCase class names (e.g., `ForwardWordCommand`) and exported from files that mirror that casing. Use snake-case JSON keys for keybinding definitions and prefix configuration IDs with `emacs-mcx.` to match existing contributes schema.

## Testing Guidelines

Use `npm test` for the Electron runner (pretest triggers `npm run test-compile` automatically) and `npm run test:web` for the browser target. Generator logic has dedicated coverage runnable through `npm run test-gen-keys`. You can also run "Extension Tests" from VS Code's debug sidebar. Add `*.test.ts` files beneath `src/test/` or alongside generator modules, name suites after the command under test, and extend fixtures so new keymaps, mark-ring behaviors, or rectangle actions are exercised. Aim to cover both positive flows and VS Code integration edge cases; failing tests block CI.

## Commit & Pull Request Guidelines

Write commits in the imperative mood with concise scopes (e.g., `Add yank history telemetry`) and cross-reference an issue number when applicable. Every PR should summarize the behavior change, list manual/automated test commands (`npm run check:eslint`, `npm run check:prettier`, `npm test`), and include screenshots or screencasts when the UX shifts. When altering keybindings, commit the updated `keybindings/*.json`, regenerated `package.json`, and README tables together. Confirm CI passes before requesting review and call out any follow-up tasks or known limitations in the description.

## Release Workflow

Queue user-visible updates with `npm run changeset` and commit the generated note. The `Release` workflow (`.github/workflows/release.yml`) opens the aggregated release PR; when merged it bumps versioning via Changesets and runs `npm run changeset:release` to tag `v<version>` and push, which triggers the existing build/publish pipelines. Don't edit `CHANGELOG.md` or `package.json` manually—Changesets owns them. For the full checklist, follow `CONTRIBUTING.md`.

## Keybinding Workflow Tips

Never edit the `contributes.keybindings` array directly; instead update the declarative source JSON, run `npm run gen-keys`, and verify the diff. Use the `keys`, `whens`, and `inheritWhenFromDefault` helpers documented in `DEVELOPMENT.md` to keep definitions DRY. Commit the regenerated `package.json` alongside `keybindings/*.json`, and mention new bindings in `README.md` so users see them in the public matrix.

## Behavior Alignment

When emulating an Emacs command that has an equivalent or close counterpart in VS Code, default to the VS Code-like behavior to stay aligned with the editor. If an Emacs-like variant is also useful, add it behind a configuration option and keep the VS Code-like value as the default.

Examples:

- Char moves: keep VS Code's default of collapsing selections, with an opt-in config for Emacs-like pre-clearing selections (`emacs-mcx.clearSelectionBeforeCharMove`).
- Word moves: default to VS Code's word boundary rules, with a configuration switch for Emacs-style word parsing (`emacs-mcx.wordNavigationStyle`).
- Line start/end: default to VS Code behavior for home/end movement (`emacs-mcx.moveBeginningOfLineBehavior` / `emacs-mcx.moveEndOfLineBehavior`), with Emacs-like options available.
