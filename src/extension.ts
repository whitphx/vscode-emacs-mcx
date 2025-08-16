import * as vscode from "vscode";
import { COMMAND_IDS } from "./commands";
import { type Registers, RegisterCommandState } from "./commands/registers";
import type { RectangleState } from "./commands/rectangle";
import { Configuration } from "./configuration/configuration";
import { WorkspaceConfigCache } from "./workspace-configuration";
import { EmacsEmulator } from "./emulator";
import { KillRing } from "./kill-yank/kill-ring";
import { Logger } from "./logger";
import { MessageManager } from "./message";
import { InputBoxMinibuffer } from "./minibuffer";
import type { Unreliable } from "./utils";

const logger = Logger.get("Extension");

export function activate(context: vscode.ExtensionContext): void {
  MessageManager.registerDispose(context);
  Configuration.registerDispose(context);
  context.subscriptions.push(WorkspaceConfigCache.instance);

  const killRing = new KillRing(Configuration.instance.killRingMax);
  const minibuffer = new InputBoxMinibuffer();
  const registers: Registers = new Map();
  const rectangleState: RectangleState = {
    latestKilledRectangle: [],
  };
  const registerCommandState = new RegisterCommandState();

  const createEmacsEmulator = (editor: vscode.TextEditor): EmacsEmulator => {
    const emacsEmulator = new EmacsEmulator(
      editor,
      killRing,
      minibuffer,
      registers,
      registerCommandState,
      rectangleState,
    );
    context.subscriptions.push(emacsEmulator);
    return emacsEmulator;
  };

  const emacsEmulatorMap = new Map<string, EmacsEmulator>();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      registerCommandState.stopAcceptingRegisterName();

      if (editor == null) {
        return;
      }

      const documentId = editor.document.uri.toString();
      const emulator = emacsEmulatorMap.get(documentId);
      if (emulator) {
        await emulator.switchTextEditor(editor);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(() => {
      const documents = vscode.workspace.textDocuments;

      // Delete emulators once all tabs of this document have been closed
      for (const uri of emacsEmulatorMap.keys()) {
        const emulator = emacsEmulatorMap.get(uri);
        if (emulator == null || !documents.includes(emulator.getTextEditor().document)) {
          emulator?.dispose();
          emacsEmulatorMap.delete(uri);
        }
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("emacs-mcx")) {
        Configuration.reload();
      }
    }),
  );

  function registerEmulatorCommand(
    commandName: string,
    callback: (emulator: EmacsEmulator, args: Unreliable<any>) => unknown, // eslint-disable-line @typescript-eslint/no-explicit-any
    onNoEmulator?: (args: Unreliable<any>) => unknown, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) {
    context.subscriptions.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vscode.commands.registerCommand(commandName, (args: Unreliable<any>) => {
        logger.debug(`[command]\t Command "${commandName}" executed with args ${JSON.stringify(args)}`);

        const activeTextEditor = vscode.window.activeTextEditor;
        if (activeTextEditor == null) {
          if (typeof onNoEmulator === "function") {
            return onNoEmulator(args);
          }
          return;
        }

        const documentId = activeTextEditor.document.uri.toString();
        let emulator = emacsEmulatorMap.get(documentId);
        if (emulator == null) {
          emulator = createEmacsEmulator(activeTextEditor);
          emacsEmulatorMap.set(documentId, emulator);
        } else {
          emulator.setTextEditor(activeTextEditor);
        }

        return callback(emulator, args);
      }),
    );
  }

  if (Configuration.instance.enableOverridingTypeCommand) {
    registerEmulatorCommand(
      "type",
      (emulator, args) => {
        const text = (args as unknown as { text: string }).text; // XXX: The arguments of `type` is guaranteed to have this signature.
        // Capture typing characters for prefix argument functionality.
        logger.debug(`[type command]\t args.text = "${text}"`);

        return emulator.type(text);
      },
      (args) => vscode.commands.executeCommand("default:type", args),
    );
  }

  registerEmulatorCommand("emacs-mcx.subsequentArgumentDigit", (emulator, args) => {
    if (typeof args !== "number") {
      return;
    }
    return emulator.subsequentArgumentDigit(args);
  });

  registerEmulatorCommand("emacs-mcx.digitArgument", (emulator, args) => {
    if (typeof args !== "number") {
      return;
    }
    return emulator.digitArgument(args);
  });

  registerEmulatorCommand("emacs-mcx.typeChar", (emulator, args) => {
    if (typeof args !== "string") {
      return;
    }
    return emulator.typeChar(args);
  });

  COMMAND_IDS.forEach((commandId) => {
    registerEmulatorCommand(`emacs-mcx.${commandId}`, (emulator, args) => {
      return emulator.runCommand(commandId, args);
    });
  });

  registerEmulatorCommand("emacs-mcx.universalArgument", (emulator) => {
    return emulator.universalArgument();
  });

  registerEmulatorCommand("emacs-mcx.negativeArgument", (emulator) => {
    return emulator.negativeArgument();
  });

  registerEmulatorCommand("emacs-mcx.yank-pop" /* For backward compatibility */, (emulator, args) => {
    logger.warn('The command "emacs-mcx.yank-pop" is deprecated. Please use "emacs-mcx.yankPop" instead.');
    return emulator.runCommand("yankPop", args);
  });

  registerEmulatorCommand("emacs-mcx.startRectCommand", (emulator, args) => {
    return emulator.runCommand("startAcceptingRectCommand", args);
  });

  registerEmulatorCommand("emacs-mcx.setMarkCommand", (emulator) => {
    return emulator.setMarkCommand();
  });

  registerEmulatorCommand("emacs-mcx.rectangleMarkMode", (emulator) => {
    return emulator.rectangleMarkMode();
  });

  registerEmulatorCommand("emacs-mcx.popMark", (emulator) => {
    return emulator.popMark();
  });

  registerEmulatorCommand("emacs-mcx.exchangePointAndMark", (emulator) => {
    return emulator.exchangePointAndMark();
  });

  registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
    return emulator.cancel();
  });

  registerEmulatorCommand("emacs-mcx.executeCommandWithPrefixArgument", (emulator, args) => {
    if (typeof args !== "object" || args == null || Array.isArray(args)) {
      return;
    }

    if (
      typeof args?.command === "string" &&
      (typeof args?.prefixArgumentKey === "string" || args?.prefixArgumentKey == null)
    ) {
      return emulator.executeCommandWithPrefixArgument(args["command"], args["args"], args["prefixArgumentKey"]);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  return;
}
