import * as vscode from "vscode";
import { EmacsEmulator } from "./emulator";
import { EmacsEmulatorMap } from "./emulator-map";
import { KillRing } from "./kill-ring";
import { MessageManager } from "./message";
import { cursorMoves } from "./operations";

export function activate(context: vscode.ExtensionContext) {
    const killRingMaxLen = 60;  // TODO: be configurable
    const killRing = new KillRing(killRingMaxLen);
    context.subscriptions.push(killRing);

    const emulatorMap = new EmacsEmulatorMap(killRing);
    context.subscriptions.push(emulatorMap);

    MessageManager.initialize(context);

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
        onNoEmulator?: (...args: any[]) => any,
    ) {
        const disposable = vscode.commands.registerCommand(commandName, (...args) => {
            const emulator = getAndUpdateEmulator();
            if (!emulator) {
                if (typeof onNoEmulator === "function") {
                    onNoEmulator(...args);
                }
                return;
            }

            callback(emulator, ...args);
        });
        context.subscriptions.push(disposable);
    }

    cursorMoves.forEach((commandName) => {
        registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator) => {
            emulator.cursorMove(commandName);
        });
    });

    registerEmulatorCommand("type",
        (emulator, args) => {
            // Capture typing charactors for universal argument functionality.
            // TODO: How to capture backspace?
            emulator.type(args.text);
        },
        (args) => vscode.commands.executeCommand("default:type", args),
    );

    registerEmulatorCommand("emacs-mcx.universalArgument", (emulator) => {
        emulator.universalArgument();
    });

    registerEmulatorCommand("emacs-mcx.killLine", (emulator) => {
        emulator.killLine();
    });

    registerEmulatorCommand("emacs-mcx.killWholeLine", (emulator) => {
        emulator.killWholeLine();
    });

    registerEmulatorCommand("emacs-mcx.killRegion", (emulator) => {
        emulator.killRegion();
    });

    registerEmulatorCommand("emacs-mcx.copyRegion", (emulator) => {
        emulator.copyRegion();
    });

    registerEmulatorCommand("emacs-mcx.yank", (emulator) => {
        emulator.yank();
    });

    registerEmulatorCommand("emacs-mcx.yank-pop", (emulator) => {
        emulator.yankPop();
    });

    registerEmulatorCommand("emacs-mcx.setMarkCommand", (emulator) => {
        emulator.setMarkCommand();
    });

    registerEmulatorCommand("emacs-mcx.addSelectionToNextFindMatch", (emulator) => {
        emulator.addSelectionToNextFindMatch();
    });

    registerEmulatorCommand("emacs-mcx.addSelectionToPreviousFindMatch", (emulator) => {
        emulator.addSelectionToPreviousFindMatch();
    });

    registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
        emulator.cancel();
    });

    registerEmulatorCommand("emacs-mcx.newLine", (emulator) => {
        emulator.newLine();
    });

    registerEmulatorCommand("emacs-mcx.transformToUppercase", (emulator) => {
        emulator.transformToUppercase();
    });

    registerEmulatorCommand("emacs-mcx.transformToLowercase", (emulator) => {
        emulator.transformToLowercase();
    });

    registerEmulatorCommand("emacs-mcx.deleteBlankLines", (emulator) => {
        emulator.deleteBlankLines();
    });

    registerEmulatorCommand("emacs-mcx.recenterTopBottom", (emulator) => {
        emulator.recenterTopBottom();
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
