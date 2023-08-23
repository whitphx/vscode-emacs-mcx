import * as vscode from "vscode";
import { moveCommandIds } from "./commands/move";
import { Configuration } from "./configuration/configuration";
import { WorkspaceConfigCache } from "./workspace-configuration";
import { EmacsEmulator } from "./emulator";
import { EmacsEmulatorMap } from "./emulator-map";
import { executeCommands } from "./execute-commands";
import { KillRing } from "./kill-yank/kill-ring";
import { logger } from "./logger";
import { MessageManager } from "./message";
import { InputBoxMinibuffer } from "./minibuffer";

// HACK: Currently there is no official type-safe way to handle
//       the unsafe inputs such as the arguments of the extensions.
// See: https://github.com/microsoft/TypeScript/issues/37700#issuecomment-940865298
type Unreliable<T> = { [P in keyof T]?: Unreliable<T[P]> } | Array<Unreliable<T>> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  MessageManager.registerDispose(context);
  Configuration.registerDispose(context);
  context.subscriptions.push(WorkspaceConfigCache.instance);

  const killRing = new KillRing(Configuration.instance.killRingMax);
  const minibuffer = new InputBoxMinibuffer();

  const emulatorMap = new EmacsEmulatorMap(killRing, minibuffer);

  function getAndUpdateEmulator() {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (typeof activeTextEditor === "undefined") {
      return undefined;
    }

    const [curEmulator, isNew] = emulatorMap.getOrCreate(activeTextEditor);
    if (isNew) {
      context.subscriptions.push(curEmulator);
    }

    return curEmulator;
  }

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(() => {
      const documents = vscode.workspace.textDocuments;

      // Delete emulators once all tabs of this document have been closed
      for (const uri of emulatorMap.keys()) {
        const emulator = emulatorMap.get(uri);
        if (emulator == null || !documents.includes(emulator.getTextEditor().document)) {
          emulatorMap.delete(uri);
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
    callback: (emulator: EmacsEmulator, ...args: Unreliable<any>[]) => unknown,
    onNoEmulator?: (...args: unknown[]) => unknown,
  ) {
    const disposable = vscode.commands.registerCommand(commandName, (...args) => {
      logger.debug(`[command]\t Command "${commandName}" executed with args (${args})`);

      const emulator = getAndUpdateEmulator();
      if (!emulator) {
        if (typeof onNoEmulator === "function") {
          return onNoEmulator(...args);
        }
        return;
      }

      return callback(emulator, ...args);
    });
    context.subscriptions.push(disposable);
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
    if (!Array.isArray(args)) {
      return;
    }
    const arg = args[0];
    if (typeof arg !== "number") {
      return;
    }
    emulator.subsequentArgumentDigit(arg);
  });

  registerEmulatorCommand("emacs-mcx.digitArgument", (emulator, args) => {
    if (!Array.isArray(args)) {
      return;
    }
    const arg = args[0];
    if (typeof arg !== "number") {
      return;
    }
    emulator.digitArgument(arg);
  });

  registerEmulatorCommand("emacs-mcx.typeChar", (emulator, args) => {
    if (!Array.isArray(args)) {
      return;
    }
    const arg = args[0];
    if (typeof arg !== "string") {
      return;
    }
    emulator.typeChar(arg);
  });

  moveCommandIds.map((commandName) => {
    registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator) => {
      emulator.runCommand(commandName);
    });
  });

  registerEmulatorCommand("emacs-mcx.isearchForward", (emulator) => {
    emulator.runCommand("isearchForward");
  });

  registerEmulatorCommand("emacs-mcx.isearchBackward", (emulator) => {
    emulator.runCommand("isearchBackward");
  });

  registerEmulatorCommand("emacs-mcx.isearchForwardRegexp", (emulator) => {
    emulator.runCommand("isearchForwardRegexp");
  });

  registerEmulatorCommand("emacs-mcx.isearchBackwardRegexp", (emulator) => {
    emulator.runCommand("isearchBackwardRegexp");
  });

  registerEmulatorCommand("emacs-mcx.queryReplace", (emulator) => {
    emulator.runCommand("queryReplace");
  });

  registerEmulatorCommand("emacs-mcx.queryReplaceRegexp", (emulator) => {
    emulator.runCommand("queryReplaceRegexp");
  });

  registerEmulatorCommand("emacs-mcx.isearchAbort", (emulator) => {
    emulator.runCommand("isearchAbort");
  });

  registerEmulatorCommand("emacs-mcx.isearchExit", async (emulator, args) => {
    await emulator.runCommand("isearchExit");

    if (args == null || typeof args !== "object" || Array.isArray(args)) {
      return;
    }
    const secondCommand = args.then;
    if (typeof secondCommand === "string") {
      await vscode.commands.executeCommand(secondCommand);
    }
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

  registerEmulatorCommand("emacs-mcx.negativeArgument", (emulator) => {
    return emulator.negativeArgument();
  });

  registerEmulatorCommand("emacs-mcx.killLine", (emulator) => {
    return emulator.runCommand("killLine");
  });

  registerEmulatorCommand("emacs-mcx.killWord", (emulator) => {
    return emulator.runCommand("killWord");
  });

  registerEmulatorCommand("emacs-mcx.backwardKillWord", (emulator) => {
    return emulator.runCommand("backwardKillWord");
  });

  registerEmulatorCommand("emacs-mcx.killWholeLine", (emulator) => {
    return emulator.runCommand("killWholeLine");
  });

  registerEmulatorCommand("emacs-mcx.killRegion", (emulator) => {
    return emulator.runCommand("killRegion");
  });

  registerEmulatorCommand("emacs-mcx.copyRegion", (emulator) => {
    return emulator.runCommand("copyRegion");
  });

  registerEmulatorCommand("emacs-mcx.yank", (emulator) => {
    return emulator.runCommand("yank");
  });

  registerEmulatorCommand("emacs-mcx.yank-pop", (emulator) => {
    return emulator.runCommand("yankPop");
  });

  registerEmulatorCommand("emacs-mcx.startRectCommand", (emulator) => {
    return emulator.runCommand("startAcceptingRectCommand");
  });

  registerEmulatorCommand("emacs-mcx.killRectangle", (emulator) => {
    return emulator.runCommand("killRectangle");
  });

  registerEmulatorCommand("emacs-mcx.copyRectangleAsKill", (emulator) => {
    return emulator.runCommand("copyRectangleAsKill");
  });

  registerEmulatorCommand("emacs-mcx.deleteRectangle", (emulator) => {
    return emulator.runCommand("deleteRectangle");
  });

  registerEmulatorCommand("emacs-mcx.yankRectangle", (emulator) => {
    return emulator.runCommand("yankRectangle");
  });

  registerEmulatorCommand("emacs-mcx.openRectangle", (emulator) => {
    return emulator.runCommand("openRectangle");
  });

  registerEmulatorCommand("emacs-mcx.clearRectangle", (emulator) => {
    return emulator.runCommand("clearRectangle");
  });

  registerEmulatorCommand("emacs-mcx.stringRectangle", (emulator) => {
    return emulator.runCommand("stringRectangle");
  });

  registerEmulatorCommand("emacs-mcx.replaceKillRingToRectangle", (emulator) => {
    return emulator.runCommand("replaceKillRingToRectangle");
  });

  registerEmulatorCommand("emacs-mcx.setMarkCommand", (emulator) => {
    emulator.setMarkCommand();
  });

  registerEmulatorCommand("emacs-mcx.rectangleMarkMode", (emulator) => {
    emulator.rectangleMarkMode();
  });

  registerEmulatorCommand("emacs-mcx.popMark", (emulator) => {
    emulator.popMark();
  });

  registerEmulatorCommand("emacs-mcx.exchangePointAndMark", (emulator) => {
    emulator.exchangePointAndMark();
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

  registerEmulatorCommand("emacs-mcx.transformToTitlecase", (emulator) => {
    emulator.runCommand("transformToTitlecase");
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

  registerEmulatorCommand("emacs-mcx.paredit.markSexp", (emulator) => {
    emulator.runCommand("paredit.markSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.killSexp", (emulator) => {
    emulator.runCommand("paredit.killSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.pareditKill", (emulator) => {
    emulator.runCommand("paredit.pareditKill");
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardKillSexp", (emulator) => {
    emulator.runCommand("paredit.backwardKillSexp");
  });

  registerEmulatorCommand("emacs-mcx.StartRegisterSaveCommand", (emulator) => {
    return emulator.runCommand("StartRegisterSaveCommand");
  });

  registerEmulatorCommand("emacs-mcx.StartRegisterInsertCommand", (emulator) => {
    return emulator.runCommand("StartRegisterInsertCommand");
  });

  registerEmulatorCommand("emacs-mcx.RegisterSaveCommand", (emulator, args) => {
    if (!Array.isArray(args)) {
      return;
    }
    const arg = args[0];
    if (typeof arg !== "string") {
      return;
    }
    return emulator.saveRegister(arg);
  });

  registerEmulatorCommand("emacs-mcx.RegisterInsertCommand", (emulator, args) => {
    if (!Array.isArray(args)) {
      return;
    }
    const arg = args[0];
    if (typeof arg !== "string") {
      return;
    }
    return emulator.insertRegister(arg);
  });
  
  vscode.commands.registerCommand("emacs-mcx.executeCommands", async (...args: any[]) => {
    if (1 <= args.length) {
      executeCommands(args[0]);
    }
  });

  registerEmulatorCommand("emacs-mcx.executeCommandWithPrefixArgument", (emulator, args) => {
    if (typeof args !== "object" || args == null || Array.isArray(args)) {
      return;
    }

    if (
      typeof args?.command === "string" &&
      (typeof args?.prefixArgumentKey === "string" || args?.prefixArgumentKey == null)
    ) {
      emulator.executeCommandWithPrefixArgument(args["command"], args["args"], args["prefixArgumentKey"]);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  return;
}
