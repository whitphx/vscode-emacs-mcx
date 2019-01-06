import * as vscode from "vscode";
import { EmacsEmulatorMap } from "./emulator-map";

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

    const disposable = vscode.commands.registerCommand("emacs-mcx.cancel", () => {
        const emulator = getAndUpdateEmulator();
        if (typeof emulator === "undefined") { return; }

        emulator.cancel();
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
