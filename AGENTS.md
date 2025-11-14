# Repository Guidelines

## Project Structure & Module Organization

TypeScript sources live in `src/`, with `src/commands/` holding individual `EmacsCommand` subclasses, `src/emulator.ts` coordinating command dispatch, and `src/test/` hosting VS Code integration specs. Keybinding data stays in `keybindings/`, while the generator CLI in `keybinding-generator/` (see `cli.mts`) writes back into `package.json`. Bundler configs sit under `build/` and `webpack.config.js`, reusable scripts in `scripts/`, shipping assets in `images/`, and vendorized deps (such as `paredit.js`) in `vendor/`. Built artifacts land in `dist/` and should be regenerated rather than edited.

## Build, Test, and Development Commands

- `npm install`: sync dependencies listed in `package-lock.json`.
- `npm run webpack` / `npm run webpack:prod`: bundle the desktop extension in dev or production mode.
- `npm run compile-web`, `watch-web`, or `package-web`: build the web-targeted artifact defined in `build/web-extension.webpack.config.js`.
- `npm run gen-keys`: regenerate `contributes.keybindings` from the JSON templates.
- `npm run vscode:prepublish`: full release pipeline (install, clean `dist/`, generate keybindings, production bundles for desktop + web).

## Coding Style & Naming Conventions

Prettier (120-char width, LF normalization) and ESLint (`eslint.config.mjs`) are the single sources of truth—stick to 2-space indentation, trailing commas, and explicit semicolons they enforce. New commands should be named with descriptive PascalCase class names (e.g., `ForwardWordCommand`) and exported from files that mirror that casing. Use snake-case JSON keys for keybinding definitions and prefix configuration IDs with `emacs-mcx.` to match existing contributes schema.

## Testing Guidelines

Use `npm test` for the Electron runner and `npm run test:web` for the browser target; both require `npm run test-compile` to succeed because the tests execute the transpiled `out/test` bundle. Generator logic has dedicated coverage runnable through `npm run test-gen-keys`. Add `*.test.ts` files beneath `src/test/` or alongside generator modules, name suites after the command under test, and extend fixtures so new keymaps, mark-ring behaviors, or rectangle actions are exercised. Aim to cover both positive flows and VS Code integration edge cases; failing tests block CI.

## Commit & Pull Request Guidelines

Write commits in the imperative mood with concise scopes (e.g., `Add yank history telemetry`) and cross-reference an issue number when applicable. Every PR should summarize the behavior change, list manual/automated test commands (`npm run check:eslint`, `npm run check:prettier`, `npm test`), and include screenshots or screencasts when the UX shifts. When altering keybindings, commit the updated `keybindings/*.json`, regenerated `package.json`, and README tables together. Confirm CI passes before requesting review and call out any follow-up tasks or known limitations in the description.

## Release Workflow

Queue user-visible updates with `npm run changeset` and commit the generated note. The `Release` workflow (`.github/workflows/release.yml`) opens the aggregated release PR, and when merged runs `npm run release` to tag `v<version>`, triggering the existing build/publish pipelines. Don't edit `CHANGELOG.md` or `package.json` manually—Changesets owns them.

## Keybinding Workflow Tips

Never edit the `contributes.keybindings` array directly; instead update the declarative source JSON, run `npm run gen-keys`, and verify the diff. Use the `keys`, `whens`, and `inheritWhenFromDefault` helpers documented in `DEVELOPMENT.md` to keep definitions DRY. Mention any new bindings in `README.md` so users see them in the public matrix.
