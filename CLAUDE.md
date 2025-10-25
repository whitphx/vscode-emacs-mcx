# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Visual Studio Code extension called "Awesome Emacs Keymap" (emacs-mcx) that provides comprehensive Emacs-like keybindings and operations for VSCode. The extension supports multi-cursor operations, kill-ring integration with system clipboard, mark-mode, mark-ring, prefix arguments, and sexp operations. The extension works both as a desktop extension and as a web extension.

## Development Commands

### Build Commands

- `npm run webpack:dev` - Development build with webpack
- `npm run webpack:prod` - Production build with webpack (hidden source maps)
- `npm run test-compile` - TypeScript compilation with tsc-alias
- `npm run compile-web` - Web extension compilation
- `npm run package-web` - Production web extension build

### Test Commands

- `npm run test` - Run VSCode extension tests from command line (requires VSCode to be installed)
- Alternatively, run tests through VSCode debug sidebar: "Extension Tests" launch configuration
- `npm run test:web` - Run web extension tests
- `npm run test-gen-keys` - Test keybinding generator

### Lint and Format Commands

- `npm run check:eslint` - Check ESLint rules
- `npm run fix:eslint` - Fix ESLint issues automatically
- `npm run check:prettier` - Check Prettier formatting
- `npm run fix:prettier` - Fix Prettier formatting automatically

### Keybinding Generation

- `npm run gen-keys` - Generate keybindings from keybindings/\*.json to package.json

## Architecture

### Core Components

**EmacsEmulator** (src/emulator.ts)

- Central controller managing all Emacs functionality
- Handles command registration and execution
- Manages mark-mode, prefix arguments, and kill-ring integration
- Coordinates between different command categories
- Each text editor gets its own EmacsEmulator instance to maintain independent state

**Extension Activation** (src/extension.ts)

- Creates shared state objects: KillRing, Minibuffer, Registers, RectangleState
- These shared objects are passed to all EmacsEmulator instances
- Maintains a Map<documentId, EmacsEmulator> to track emulator instances per document
- Registers all commands using `registerEmulatorCommand` helper
- Handles lifecycle: creates emulators on-demand, disposes when documents close

**Command Architecture**

- Commands are organized by category in src/commands/
- Each command extends EmacsCommand base class
- Commands are registered in EmacsCommandRegistry within EmacsEmulator constructor
- Command categories: move, edit, kill, find, case, paredit, rectangle, etc.
- Commands receive IEmacsController interface to interact with emulator state

**Kill-Ring System** (src/kill-yank/)

- Integrates with system clipboard
- Maintains kill-ring history separate from clipboard
- Supports both editor text and clipboard text entities
- Shared across all emulator instances (one global kill-ring)

**Mark and Selection Management**

- Mark-mode implementation with mark-ring support (per-editor state)
- Rectangle mark mode for block operations
- Multi-cursor support throughout all operations
- NativeSelectionsStore manages underlying selections vs visual rectangle selections

### Key Files

- `src/extension.ts` - Extension entry point, activation, shared state, command registration
- `src/emulator.ts` - Core emulator implementation, per-editor state management
- `src/commands/` - All command implementations organized by category
- `src/kill-yank/` - Kill-ring and yank functionality
- `src/configuration/` - Extension configuration management
- `keybindings/*.json` - Source keybinding definitions (NOT package.json directly)

## Development Workflow

### Adding New Commands

1. Create command class in appropriate src/commands/ file (extends EmacsCommand)
2. Register command in EmacsCommandRegistry within EmacsEmulator constructor
3. Add command to extension.ts using `bindEmulatorCommand(name)` or `registerEmulatorCommand(...)`
4. Add keybinding to appropriate file in keybindings/ directory (NOT package.json)
5. Run `npm run gen-keys` to update package.json with generated keybindings
6. Update README.md with new keybinding documentation

See DEVELOPMENT.md for detailed instructions.

### Keybinding System

- **CRITICAL: Never edit package.json keybindings directly**
- Edit JSON files in keybindings/ directory instead (e.g., move-edit.json, paredit.json, etc.)
- Run `npm run gen-keys` to generate package.json keybindings
- Extended syntax in keybindings/\*.json:
  - `keys` array: define multiple key combinations for one command
  - `whens` array: define multiple when conditions for one command
  - `meta` key: automatically generates alt/cmd/ctrl+[/escape variants with config conditions
  - `inheritWhenFromDefault`: copies when condition from VSCode's default keybinding
  - Comments are supported (will be stripped during generation)

### Testing

- Unit tests use VSCode's extension testing framework
- Tests are located in src/test/suite/
- Run tests via VSCode debug sidebar ("Extension Tests" configuration) or `npm run test` from command line
- Web extension tests run separately with `npm run test:web`
- Keybinding generator tests: `npm run test-gen-keys`

## Configuration

The extension provides extensive configuration through `emacs-mcx.*` settings:

- `emacs-mcx.killRingMax` - Kill ring size (default: 60)
- `emacs-mcx.useMetaPrefixEscape` - Enable Escape as Meta prefix
- `emacs-mcx.useMetaPrefixCtrlLeftBracket` - Enable Ctrl+[ as Meta prefix
- `emacs-mcx.useMetaPrefixAlt` - Enable Alt as Meta prefix (default: true)
- `emacs-mcx.useMetaPrefixMacCmd` - Enable Cmd (⌘) as Meta prefix on macOS
- `emacs-mcx.strictEmacsMove` - (Deprecated) Strict Emacs cursor movement
- Movement behavior configs: `moveBeginningOfLineBehavior`, `moveEndOfLineBehavior`, `scrollUpCommandBehavior`, `scrollDownCommandBehavior`
- And many more documented in package.json and README.md

## Important Notes

- Extension targets VSCode ^1.89.0
- Uses webpack for bundling with separate web extension build
- Requires TypeScript compilation with tsc-alias for path mapping
- Keybinding conflicts with VSCode defaults are documented in README.md
- The extension uses paredit.js library for sexp operations
- CI must pass all ESLint, Prettier, and unit tests before PR merge
