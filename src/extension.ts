import * as vscode from "vscode";
import { moveCommandIds } from "./commands/move";
import { Configuration } from "./configuration/configuration";
import { EmacsEmulator } from "./emulator";
import { EmacsEmulatorMap } from "./emulator-map";
import { executeCommands } from "./execute-commands";
import { KillRing } from "./kill-yank/kill-ring";
import { MessageManager } from "./message";

export function activate(context: vscode.ExtensionContext) {
    MessageManager.initialize(context);
    Configuration.initialize(context);

    const killRing = new KillRing(Configuration.instance.killRingMax);
    context.subscriptions.push(killRing);

    const emulatorMap = new EmacsEmulatorMap(killRing);
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

    registerEmulatorCommand("type",
        (emulator, args) => {
            // Capture typing charactors for universal argument functionality.
            // TODO: How to capture backspace?
            emulator.type(args.text);
        },
        (args) => vscode.commands.executeCommand("default:type", args),
    );

    moveCommandIds.map((commandName) => {
        registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator) => {
            emulator.runCommand(commandName);
        });
    });

    registerEmulatorCommand("emacs-mcx.deleteBackwardChar", (emulator) => {
        emulator.runCommand("deleteBackwardChar");
    });

    registerEmulatorCommand("emacs-mcx.deleteForwardChar", (emulator) => {
        emulator.runCommand("deleteForwardChar");
    });

    registerEmulatorCommand("emacs-mcx.universalArgument", (emulator) => {
        emulator.universalArgument();
    });

    registerEmulatorCommand("emacs-mcx.killLine", (emulator) => {
        emulator.runCommand("killLine");
    });

    registerEmulatorCommand("emacs-mcx.killWord", (emulator) => {
        emulator.runCommand("killWord");
    });

    registerEmulatorCommand("emacs-mcx.backwardKillWord", (emulator) => {
        emulator.runCommand("backwardKillWord");
    });

    registerEmulatorCommand("emacs-mcx.killWholeLine", (emulator) => {
        emulator.runCommand("killWholeLine");
    });

    registerEmulatorCommand("emacs-mcx.killRegion", (emulator) => {
        emulator.runCommand("killRegion");
    });

    registerEmulatorCommand("emacs-mcx.copyRegion", (emulator) => {
        emulator.runCommand("copyRegion");
    });

    registerEmulatorCommand("emacs-mcx.yank", (emulator) => {
        emulator.runCommand("yank");
    });

    registerEmulatorCommand("emacs-mcx.yank-pop", (emulator) => {
        emulator.runCommand("yankPop");
    });

    registerEmulatorCommand("emacs-mcx.setMarkCommand", (emulator) => {
        emulator.setMarkCommand();
    });

    registerEmulatorCommand("emacs-mcx.addSelectionToNextFindMatch", (emulator) => {
        emulator.runCommand("addSelectionToNextFindMatch");
    });

    registerEmulatorCommand("emacs-mcx.addSelectionToPreviousFindMatch", (emulator) => {
        emulator.runCommand("addSelectionToPreviousFindMatch");
    });

    registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
        emulator.cancel();
    });

    registerEmulatorCommand("emacs-mcx.newLine", (emulator) => {
        emulator.runCommand("newLine");
    });

    registerEmulatorCommand("emacs-mcx.transformToUppercase", (emulator) => {
        emulator.runCommand("transformToUppercase");
    });

    registerEmulatorCommand("emacs-mcx.transformToLowercase", (emulator) => {
        emulator.runCommand("transformToLowercase");
    });

    registerEmulatorCommand("emacs-mcx.deleteBlankLines", (emulator) => {
        emulator.runCommand("deleteBlankLines");
    });

    registerEmulatorCommand("emacs-mcx.recenterTopBottom", (emulator) => {
        emulator.runCommand("recenterTopBottom");
    });

    registerEmulatorCommand("emacs-mcx.paredit.forwardSexp", (emulator) => {
        emulator.runCommand("paredit.forwardSexp");
    });

    registerEmulatorCommand("emacs-mcx.paredit.forwardDownSexp", (emulator) => {
        emulator.runCommand("paredit.forwardDownSexp");
    });

    registerEmulatorCommand("emacs-mcx.paredit.backwardSexp", (emulator) => {
        emulator.runCommand("paredit.backwardSexp");
    });

    registerEmulatorCommand("emacs-mcx.paredit.backwardUpSexp", (emulator) => {
        emulator.runCommand("paredit.backwardUpSexp");
    });

    vscode.commands.registerCommand("emacs-mcx.executeCommands", async (...args: any[]) => {
        if (1 <= args.length) {
            executeCommands(args[0]);
        }
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
