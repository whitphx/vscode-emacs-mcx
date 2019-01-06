import * as vscode from "vscode";
import { EmacsEmulator } from "./emulator";
import { EmacsEmulatorMap } from "./emulator-map";
import { cursorMoves } from "./operations";

export function activate(context: vscode.ExtensionContext) {
    const emulatorMap = new EmacsEmulatorMap();
    context.subscriptions.push(emulatorMap);

    function getAndUpdateEmulator() {
        const activeTextEditor = vscode.window.activeTextEditor;
        if (typeof activeTextEditor === "undefined") { return undefined; }

        const [curEmulator, isNew] = emulatorMap.getOrCreate(activeTextEditor);
        if (isNew) {
            context.subscriptions.push(curEmulator);
        }

        return curEmulator;
    }

    vscode.workspace.onDidCloseTextDocument(() => {
        const documents = vscode.workspace.textDocuments;

        // Delete emulators once all tabs of this document have been closed
        for (const key of emulatorMap.getKeys()) {
            const emulator = emulatorMap.get(key);
            if (emulator === undefined ||
                emulator.getTextEditor() === undefined ||
                documents.indexOf(emulator.getTextEditor().document) === -1) {
                    emulatorMap.delete(key);
                }
        }
    });

    function registerEmulatorCommand(
        commandName: string,
        callback: (emulator: EmacsEmulator, ...args: any[]) => any,
    ) {
        const disposable = vscode.commands.registerCommand(commandName, () => {
            const emulator = getAndUpdateEmulator();
            if (!emulator) {
                return;
            }

            callback(emulator);
        });
        context.subscriptions.push(disposable);
    }

    cursorMoves.forEach((commandName) => {
        registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator) => {
            emulator.cursorMove(commandName);
        });
    });

    registerEmulatorCommand("emacs-mcx.killRegion", (emulator) => {
        emulator.killRegion();
    });

    registerEmulatorCommand("emacs-mcx.copy", (emulator) => {
        emulator.copy();
    });

    registerEmulatorCommand("emacs-mcx.yank", (emulator) => {
        emulator.yank();
    });

    registerEmulatorCommand("emacs-mcx.enterMarkMode", (emulator) => {
        emulator.enterMarkMode();
    });

    registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
        emulator.cancel();
    });

    registerEmulatorCommand("emacs-mcx.deleteRight", (emulator) => {
        emulator.deleteRight();
    });

    registerEmulatorCommand("emacs-mcx.deleteLeft", (emulator) => {
        emulator.deleteLeft();
    });

    // TODO: Implement these commands
    [
        "emacs-mcx.killLine",
        "emacs-mcx.breakLine",
        "emacs-mcx.deleteBlankLines",
        "emacs-mcx.scrollLineToCenterTopBottom",
        "emacs-mcx.deleteLine",
    ].forEach((commandName) => {
        registerEmulatorCommand(commandName, (emulator) => {
            vscode.window.showInformationMessage(`Sorry, ${commandName} is not implemented yet.`);
        });
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
