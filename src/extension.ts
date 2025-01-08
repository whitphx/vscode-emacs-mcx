import * as vscode from "vscode";
import { moveCommandIds } from "./commands/move";
import type { Registers } from "./commands/registers";
import { Configuration } from "./configuration/configuration";
import { WorkspaceConfigCache } from "./workspace-configuration";
import { EmacsEmulator } from "./emulator";
import { EmacsEmulatorMap } from "./emulator-map";
import { KillRing } from "./kill-yank/kill-ring";
import { logger } from "./logger";
import { MessageManager } from "./message";
import { InputBoxMinibuffer } from "./minibuffer";
import type { Unreliable } from "./utils";

export function activate(context: vscode.ExtensionContext): void {
  MessageManager.registerDispose(context);
  Configuration.registerDispose(context);
  context.subscriptions.push(WorkspaceConfigCache.instance);

  const killRing = new KillRing(Configuration.instance.killRingMax);
  const minibuffer = new InputBoxMinibuffer();
  const registers: Registers = new Map();

  const emulatorMap = new EmacsEmulatorMap(killRing, minibuffer, registers);

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
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor == null) {
        return;
      }

      const [curEmulator, isNew] = emulatorMap.getOrCreate(editor);
      if (isNew) {
        context.subscriptions.push(curEmulator);
      } else {
        // NOTE: `switchTextEditor()`'s behavior is flaky
        // as it depends on a delay with an ad-hoc duration,
        // so it's important to put this call at this else block
        // and avoid calling it when it's not necessary.
        curEmulator.switchTextEditor(editor);
      }
    }),
  );

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
    callback: (emulator: EmacsEmulator, ...args: Unreliable<any>[]) => unknown, // eslint-disable-line @typescript-eslint/no-explicit-any
    onNoEmulator?: (...args: unknown[]) => unknown,
  ) {
    const disposable = vscode.commands.registerCommand(commandName, (...args) => {
      logger.debug(`[command]\t Command "${commandName}" executed with args (${JSON.stringify(args)})`);

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
      (emulator, arg0) => {
        const text = (arg0 as unknown as { text: string }).text; // XXX: The arguments of `type` is guaranteed to have this signature.
        // Capture typing characters for prefix argument functionality.
        logger.debug(`[type command]\t args.text = "${text}"`);

        return emulator.type(text);
      },
      (arg0) => vscode.commands.executeCommand("default:type", arg0),
    );
  }

  registerEmulatorCommand("emacs-mcx.subsequentArgumentDigit", (emulator, arg0) => {
    if (!Array.isArray(arg0)) {
      return;
    }
    const arg = arg0[0];
    if (typeof arg !== "number") {
      return;
    }
    return emulator.subsequentArgumentDigit(arg);
  });

  registerEmulatorCommand("emacs-mcx.digitArgument", (emulator, arg0) => {
    if (!Array.isArray(arg0)) {
      return;
    }
    const arg = arg0[0];
    if (typeof arg !== "number") {
      return;
    }
    return emulator.digitArgument(arg);
  });

  registerEmulatorCommand("emacs-mcx.typeChar", (emulator, arg0) => {
    if (!Array.isArray(arg0)) {
      return;
    }
    const arg = arg0[0];
    if (typeof arg !== "string") {
      return;
    }
    return emulator.typeChar(arg);
  });

  moveCommandIds.map((commandName) => {
    registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator) => {
      return emulator.runCommand(commandName);
    });
  });

  registerEmulatorCommand("emacs-mcx.isearchForward", (emulator) => {
    return emulator.runCommand("isearchForward");
  });

  registerEmulatorCommand("emacs-mcx.isearchBackward", (emulator) => {
    return emulator.runCommand("isearchBackward");
  });

  registerEmulatorCommand("emacs-mcx.isearchForwardRegexp", (emulator) => {
    return emulator.runCommand("isearchForwardRegexp");
  });

  registerEmulatorCommand("emacs-mcx.isearchBackwardRegexp", (emulator) => {
    return emulator.runCommand("isearchBackwardRegexp");
  });

  registerEmulatorCommand("emacs-mcx.queryReplace", (emulator) => {
    return emulator.runCommand("queryReplace");
  });

  registerEmulatorCommand("emacs-mcx.queryReplaceRegexp", (emulator) => {
    return emulator.runCommand("queryReplaceRegexp");
  });

  registerEmulatorCommand("emacs-mcx.isearchAbort", (emulator) => {
    return emulator.runCommand("isearchAbort");
  });

  registerEmulatorCommand("emacs-mcx.isearchExit", (emulator, ...args) => {
    return emulator.runCommand("isearchExit", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteBackwardChar", (emulator) => {
    return emulator.runCommand("deleteBackwardChar");
  });

  registerEmulatorCommand("emacs-mcx.deleteForwardChar", (emulator) => {
    return emulator.runCommand("deleteForwardChar");
  });

  registerEmulatorCommand("emacs-mcx.deleteHorizontalSpace", (emulator) => {
    return emulator.runCommand("deleteHorizontalSpace");
  });

  registerEmulatorCommand("emacs-mcx.universalArgument", (emulator) => {
    return emulator.universalArgument();
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

  registerEmulatorCommand("emacs-mcx.addSelectionToNextFindMatch", (emulator) => {
    return emulator.runCommand("addSelectionToNextFindMatch");
  });

  registerEmulatorCommand("emacs-mcx.addSelectionToPreviousFindMatch", (emulator) => {
    return emulator.runCommand("addSelectionToPreviousFindMatch");
  });

  registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
    return emulator.cancel();
  });

  registerEmulatorCommand("emacs-mcx.newLine", (emulator) => {
    return emulator.runCommand("newLine");
  });

  registerEmulatorCommand("emacs-mcx.transformToUppercase", (emulator) => {
    return emulator.runCommand("transformToUppercase");
  });

  registerEmulatorCommand("emacs-mcx.transformToLowercase", (emulator) => {
    return emulator.runCommand("transformToLowercase");
  });

  registerEmulatorCommand("emacs-mcx.transformToTitlecase", (emulator) => {
    return emulator.runCommand("transformToTitlecase");
  });

  registerEmulatorCommand("emacs-mcx.deleteBlankLines", (emulator) => {
    return emulator.runCommand("deleteBlankLines");
  });

  registerEmulatorCommand("emacs-mcx.recenterTopBottom", (emulator) => {
    return emulator.runCommand("recenterTopBottom");
  });

  registerEmulatorCommand("emacs-mcx.tabToTabStop", (emulator) => {
    return emulator.runCommand("tabToTabStop");
  });

  registerEmulatorCommand("emacs-mcx.deleteIndentation", (emulator) => {
    return emulator.runCommand("deleteIndentation");
  });

  registerEmulatorCommand("emacs-mcx.paredit.forwardSexp", (emulator) => {
    return emulator.runCommand("paredit.forwardSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.forwardDownSexp", (emulator) => {
    return emulator.runCommand("paredit.forwardDownSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardSexp", (emulator) => {
    return emulator.runCommand("paredit.backwardSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardUpSexp", (emulator) => {
    return emulator.runCommand("paredit.backwardUpSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.markSexp", (emulator) => {
    return emulator.runCommand("paredit.markSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.killSexp", (emulator) => {
    return emulator.runCommand("paredit.killSexp");
  });

  registerEmulatorCommand("emacs-mcx.paredit.pareditKill", (emulator) => {
    return emulator.runCommand("paredit.pareditKill");
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardKillSexp", (emulator) => {
    return emulator.runCommand("paredit.backwardKillSexp");
  });

  registerEmulatorCommand("emacs-mcx.copyToRegister", (emulator) => {
    return emulator.runCommand("copyToRegister");
  });

  registerEmulatorCommand("emacs-mcx.insertRegister", (emulator) => {
    return emulator.runCommand("insertRegister");
  });

  registerEmulatorCommand("emacs-mcx.copyRectangleToRegister", (emulator) => {
    return emulator.runCommand("copyRectangleToRegister");
  });

  registerEmulatorCommand("emacs-mcx.pointToRegister", (emulator) => {
    return emulator.runCommand("pointToRegister");
  });

  registerEmulatorCommand("emacs-mcx.jumpToRegister", (emulator) => {
    return emulator.runCommand("jumpToRegister");
  });

  registerEmulatorCommand("emacs-mcx.registerNameCommand", (emulator, ...args) => {
    return emulator.runCommand("registerNameCommand", args);
  });

  registerEmulatorCommand("emacs-mcx.executeCommandWithPrefixArgument", (emulator, arg0) => {
    if (typeof arg0 !== "object" || arg0 == null || Array.isArray(arg0)) {
      return;
    }

    if (
      typeof arg0?.command === "string" &&
      (typeof arg0?.prefixArgumentKey === "string" || arg0?.prefixArgumentKey == null)
    ) {
      return emulator.executeCommandWithPrefixArgument(arg0["command"], arg0["args"], arg0["prefixArgumentKey"]);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  return;
}
