# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Visual Studio Code extension called "Awesome Emacs Keymap" (emacs-mcx) that provides comprehensive Emacs-like keybindings and operations for VSCode. The extension supports multi-cursor operations, kill-ring integration with system clipboard, mark-mode, mark-ring, prefix arguments, and sexp operations.

## Development Commands

### Build Commands

- `npm run webpack:dev` - Development build with webpack
- `npm run webpack:prod` - Production build with webpack (hidden source maps)
- `npm run test-compile` - TypeScript compilation with tsc-alias
- `npm run compile-web` - Web extension compilation
- `npm run package-web` - Production web extension build

### Test Commands

- `npm run test` - Run VSCode extension tests (requires VSCode to be installed)
- `npm run test:web` - Run web extension tests
- `npm run test-gen-keys` - Test keybinding generator

### Lint and Format Commands

- `npm run check:eslint` - Check ESLint rules
- `npm run fix:eslint` - Fix ESLint issues automatically
- `npm run check:prettier` - Check Prettier formatting
- `npm run fix:prettier` - Fix Prettier formatting automatically

### Keybinding Generation

- `npm run gen-keys` - Generate keybindings from keybindings.json to package.json

## Architecture

### Core Components

**EmacsEmulator** (src/emulator.ts)

- Central controller managing all Emacs functionality
- Handles command registration and execution
- Manages mark-mode, prefix arguments, and kill-ring integration
- Coordinates between different command categories

**EmacsEmulatorMap** (src/emulator-map.ts)

- Maps text editors to their corresponding emulator instances
- Ensures each editor has its own independent emulator state

**Command Architecture**

- Commands are organized by category in src/commands/
- Each command extends EmacsCommand base class
- Commands are registered in EmacsCommandRegistry
- Command categories: move, edit, kill, find, case, paredit, rectangle, etc.

**Kill-Ring System** (src/kill-yank/)

- Integrates with system clipboard
- Maintains kill-ring history separate from clipboard
- Supports both editor text and clipboard text entities

**Mark and Selection Management**

- Mark-mode implementation with mark-ring support
- Rectangle mark mode for block operations
- Multi-cursor support throughout all operations

### Key Files

- `src/extension.ts` - Extension entry point and activation
- `src/emulator.ts` - Core emulator implementation
- `src/commands/` - All command implementations
- `src/kill-yank/` - Kill-ring and yank functionality
- `src/configuration/` - Extension configuration management
- `keybindings.json` - Source keybinding definitions (not package.json)

## Development Workflow

### Adding New Commands

1. Create command class in appropriate src/commands/ file
2. Register command in EmacsEmulator constructor
3. Add command to extension.ts registerCommand calls
4. Add keybinding to keybindings.json (not package.json)
5. Run `npm run gen-keys` to update package.json
6. Update README.md with new keybinding documentation

### Keybinding System

- **Never edit package.json keybindings directly**
- Edit keybindings.json instead
- Run `npm run gen-keys` to generate package.json keybindings
- keybindings.json supports extended syntax (multiple keys, meta key, comments)
- Meta key automatically generates alt/cmd/ctrl+[/escape variants based on config

### Testing

- Unit tests use VSCode's extension testing framework
- Tests are located in src/test/suite/
- Run tests through VSCode debug sidebar or `npm run test`
- Web extension tests run separately with `npm run test:web`

## Configuration

The extension provides extensive configuration through `emacs-mcx.*` settings:

- `emacs-mcx.killRingMax` - Kill ring size
- `emacs-mcx.useMetaPrefixEscape` - Enable Escape as Meta prefix
- `emacs-mcx.strictEmacsMove` - Strict Emacs cursor movement
- And many more documented in package.json and README.md

## Common Issues

- Extension targets VSCode ^1.89.0
- Uses webpack for bundling with separate web extension build
- Requires TypeScript compilation with tsc-alias for path mapping
- Keybinding conflicts with VSCode defaults are documented in README.md
