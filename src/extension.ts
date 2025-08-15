import * as vscode from "vscode";
import { moveCommandIds } from "./commands/move";
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

  moveCommandIds.map((commandName) => {
    registerEmulatorCommand(`emacs-mcx.${commandName}`, (emulator, args) => {
      return emulator.runCommand(commandName, args);
    });
  });

  registerEmulatorCommand("emacs-mcx.gotoLine", (emulator, args) => {
    return emulator.runCommand("gotoLine", args);
  });

  registerEmulatorCommand("emacs-mcx.findDefinitions", (emulator, args) => {
    return emulator.runCommand("findDefinitions", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchForward", (emulator, args) => {
    return emulator.runCommand("isearchForward", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchBackward", (emulator, args) => {
    return emulator.runCommand("isearchBackward", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchForwardRegexp", (emulator, args) => {
    return emulator.runCommand("isearchForwardRegexp", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchBackwardRegexp", (emulator, args) => {
    return emulator.runCommand("isearchBackwardRegexp", args);
  });

  registerEmulatorCommand("emacs-mcx.queryReplace", (emulator, args) => {
    return emulator.runCommand("queryReplace", args);
  });

  registerEmulatorCommand("emacs-mcx.queryReplaceRegexp", (emulator, args) => {
    return emulator.runCommand("queryReplaceRegexp", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchAbort", (emulator, args) => {
    return emulator.runCommand("isearchAbort", args);
  });

  registerEmulatorCommand("emacs-mcx.isearchExit", (emulator, args) => {
    return emulator.runCommand("isearchExit", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteBackwardChar", (emulator, args) => {
    return emulator.runCommand("deleteBackwardChar", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteForwardChar", (emulator, args) => {
    return emulator.runCommand("deleteForwardChar", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteHorizontalSpace", (emulator, args) => {
    return emulator.runCommand("deleteHorizontalSpace", args);
  });

  registerEmulatorCommand("emacs-mcx.universalArgument", (emulator) => {
    return emulator.universalArgument();
  });

  registerEmulatorCommand("emacs-mcx.negativeArgument", (emulator) => {
    return emulator.negativeArgument();
  });

  registerEmulatorCommand("emacs-mcx.killLine", (emulator, args) => {
    return emulator.runCommand("killLine", args);
  });

  registerEmulatorCommand("emacs-mcx.killWord", (emulator, args) => {
    return emulator.runCommand("killWord", args);
  });

  registerEmulatorCommand("emacs-mcx.backwardKillWord", (emulator, args) => {
    return emulator.runCommand("backwardKillWord", args);
  });

  registerEmulatorCommand("emacs-mcx.killWholeLine", (emulator, args) => {
    return emulator.runCommand("killWholeLine", args);
  });

  registerEmulatorCommand("emacs-mcx.killRegion", (emulator, args) => {
    return emulator.runCommand("killRegion", args);
  });

  registerEmulatorCommand("emacs-mcx.copyRegion", (emulator, args) => {
    return emulator.runCommand("copyRegion", args);
  });

  registerEmulatorCommand("emacs-mcx.yank", (emulator, args) => {
    return emulator.runCommand("yank", args);
  });

  registerEmulatorCommand("emacs-mcx.yankPop", (emulator, args) => {
    return emulator.runCommand("yankPop", args);
  });
  registerEmulatorCommand("emacs-mcx.yank-pop" /* For backward compatibility */, (emulator, args) => {
    logger.warn('The command "emacs-mcx.yank-pop" is deprecated. Please use "emacs-mcx.yankPop" instead.');
    return emulator.runCommand("yankPop", args);
  });

  registerEmulatorCommand("emacs-mcx.browseKillRing", (emulator, args) => {
    return emulator.runCommand("browseKillRing", args);
  });

  registerEmulatorCommand("emacs-mcx.startRectCommand", (emulator, args) => {
    return emulator.runCommand("startAcceptingRectCommand", args);
  });

  registerEmulatorCommand("emacs-mcx.killRectangle", (emulator, args) => {
    return emulator.runCommand("killRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.copyRectangleAsKill", (emulator, args) => {
    return emulator.runCommand("copyRectangleAsKill", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteRectangle", (emulator, args) => {
    return emulator.runCommand("deleteRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.yankRectangle", (emulator, args) => {
    return emulator.runCommand("yankRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.openRectangle", (emulator, args) => {
    return emulator.runCommand("openRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.clearRectangle", (emulator, args) => {
    return emulator.runCommand("clearRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.stringRectangle", (emulator, args) => {
    return emulator.runCommand("stringRectangle", args);
  });

  registerEmulatorCommand("emacs-mcx.replaceKillRingToRectangle", (emulator, args) => {
    return emulator.runCommand("replaceKillRingToRectangle", args);
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

  registerEmulatorCommand("emacs-mcx.addSelectionToNextFindMatch", (emulator, args) => {
    return emulator.runCommand("addSelectionToNextFindMatch", args);
  });

  registerEmulatorCommand("emacs-mcx.addSelectionToPreviousFindMatch", (emulator, args) => {
    return emulator.runCommand("addSelectionToPreviousFindMatch", args);
  });

  registerEmulatorCommand("emacs-mcx.cancel", (emulator) => {
    return emulator.cancel();
  });

  registerEmulatorCommand("emacs-mcx.newLine", (emulator, args) => {
    return emulator.runCommand("newLine", args);
  });

  registerEmulatorCommand("emacs-mcx.transformToUppercase", (emulator, args) => {
    return emulator.runCommand("transformToUppercase", args);
  });

  registerEmulatorCommand("emacs-mcx.transformToLowercase", (emulator, args) => {
    return emulator.runCommand("transformToLowercase", args);
  });

  registerEmulatorCommand("emacs-mcx.transformToTitlecase", (emulator, args) => {
    return emulator.runCommand("transformToTitlecase", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteBlankLines", (emulator, args) => {
    return emulator.runCommand("deleteBlankLines", args);
  });

  registerEmulatorCommand("emacs-mcx.recenterTopBottom", (emulator, args) => {
    return emulator.runCommand("recenterTopBottom", args);
  });

  registerEmulatorCommand("emacs-mcx.tabToTabStop", (emulator, args) => {
    return emulator.runCommand("tabToTabStop", args);
  });

  registerEmulatorCommand("emacs-mcx.deleteIndentation", (emulator, args) => {
    return emulator.runCommand("deleteIndentation", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.forwardSexp", (emulator, args) => {
    return emulator.runCommand("paredit.forwardSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.forwardDownSexp", (emulator, args) => {
    return emulator.runCommand("paredit.forwardDownSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardSexp", (emulator, args) => {
    return emulator.runCommand("paredit.backwardSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardUpSexp", (emulator, args) => {
    return emulator.runCommand("paredit.backwardUpSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.markSexp", (emulator, args) => {
    return emulator.runCommand("paredit.markSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.killSexp", (emulator, args) => {
    return emulator.runCommand("paredit.killSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.pareditKill", (emulator, args) => {
    return emulator.runCommand("paredit.pareditKill", args);
  });

  registerEmulatorCommand("emacs-mcx.paredit.backwardKillSexp", (emulator, args) => {
    return emulator.runCommand("paredit.backwardKillSexp", args);
  });

  registerEmulatorCommand("emacs-mcx.copyToRegister", (emulator, args) => {
    return emulator.runCommand("copyToRegister", args);
  });

  registerEmulatorCommand("emacs-mcx.insertRegister", (emulator, args) => {
    return emulator.runCommand("insertRegister", args);
  });

  registerEmulatorCommand("emacs-mcx.copyRectangleToRegister", (emulator, args) => {
    return emulator.runCommand("copyRectangleToRegister", args);
  });

  registerEmulatorCommand("emacs-mcx.pointToRegister", (emulator, args) => {
    return emulator.runCommand("pointToRegister", args);
  });

  registerEmulatorCommand("emacs-mcx.jumpToRegister", (emulator, args) => {
    return emulator.runCommand("jumpToRegister", args);
  });

  registerEmulatorCommand("emacs-mcx.registerNameCommand", (emulator, args) => {
    return emulator.runCommand("registerNameCommand", args);
  });

  registerEmulatorCommand("emacs-mcx.scrollOtherWindow", (emulator, args) => {
    return emulator.runCommand("scrollOtherWindow", args);
  });

  registerEmulatorCommand("emacs-mcx.scrollOtherWindowDown", (emulator, args) => {
    return emulator.runCommand("scrollOtherWindowDown", args);
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
