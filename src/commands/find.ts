import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { IEmacsController } from "../emulator";
import { MessageManager } from "../message";
import { revealPrimaryActive } from "./helpers/reveal";
import { WorkspaceConfigCache } from "../workspace-configuration";

export interface SearchState {
  startSelections: readonly vscode.Selection[] | undefined;
}

interface FindArgs {
  // See https://github.com/microsoft/vscode/blob/1.64.0/src/vs/editor/contrib/find/browser/findController.ts#L588-L599
  searchString?: string;
  replaceString?: string;
  isRegex: boolean;
  matchWholeWord: boolean;
  isCaseSensitive: boolean;
  preserveCase: boolean;
}

abstract class IsearchCommand extends EmacsCommand {
  protected searchState: SearchState;

  public constructor(emacsController: IEmacsController, searchState: SearchState) {
    super(emacsController);

    this.searchState = searchState;
  }

  protected openFindWidget(opts: { isRegex: boolean; replaceString?: string }): Thenable<void> {
    const { isRegex, replaceString } = opts;

    const findArgs: FindArgs = {
      searchString: undefined,
      replaceString,
      isRegex,
      matchWholeWord: false,
      isCaseSensitive: false,
      preserveCase: false,
    };

    const { seedSearchStringFromSelection } = WorkspaceConfigCache.get("editor.find");

    if (seedSearchStringFromSelection === "never") {
      return vscode.commands.executeCommand("editor.actions.findWithArgs", findArgs);
    }

    // `editor.actions.findWithArgs` respects the `editor.find.seedSearchStringFromSelection` config
    // when the previous search string is empty; https://github.com/microsoft/vscode/blob/5554b12acf27056905806867f251c859323ff7e9/src/vs/editor/contrib/find/browser/findController.ts#L604
    // Then we set an empty string once and call the command again
    // so that the config is effective when it is necessary e.g. not set as "never".
    return vscode.commands
      .executeCommand("editor.actions.findWithArgs", {
        ...findArgs,
        searchString: "",
      })
      .then(() => vscode.commands.executeCommand("editor.actions.findWithArgs", findArgs));
  }
}

export class IsearchForward extends IsearchCommand {
  public readonly id = "isearchForward";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;

    return this.openFindWidget({ isRegex: false }).then(() =>
      vscode.commands.executeCommand<void>("editor.action.nextMatchFindAction"),
    );
  }
}

export class IsearchBackward extends IsearchCommand {
  public readonly id = "isearchBackward";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;
    return this.openFindWidget({ isRegex: false }).then(() =>
      vscode.commands.executeCommand<void>("editor.action.previousMatchFindAction"),
    );
  }
}

export class IsearchForwardRegexp extends IsearchCommand {
  public readonly id = "isearchForwardRegexp";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;
    return this.openFindWidget({ isRegex: true }).then(() =>
      vscode.commands.executeCommand<void>("editor.action.nextMatchFindAction"),
    );
  }
}

export class IsearchBackwardRegexp extends IsearchCommand {
  public readonly id = "isearchBackwardRegexp";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;
    return this.openFindWidget({ isRegex: true }).then(() =>
      vscode.commands.executeCommand<void>("editor.action.previousMatchFindAction"),
    );
  }
}

export class QueryReplace extends IsearchCommand {
  public readonly id = "queryReplace";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;
    // I could not find a way to open the find widget with `editor.actions.findWithArgs`
    // revealing the replace input and restoring the both query and replace strings.
    // So `editor.action.startFindReplaceAction` is used here.
    return vscode.commands.executeCommand("editor.action.startFindReplaceAction");
  }
}

export class QueryReplaceRegexp extends IsearchCommand {
  public readonly id = "queryReplaceRegexp";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.searchState.startSelections = textEditor.selections;
    // Like `queryReplace` command, I could not find a way to open the find widget with the desired state.
    // In this command, setting `isRegex` is the priority and I gave up restoring the replace string by setting ´replaceString=undefined`.
    return this.openFindWidget({ isRegex: true, replaceString: "" });
  }
}

/**
 * C-g
 */
export class IsearchAbort extends IsearchCommand {
  public readonly id = "isearchAbort";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    if (this.searchState.startSelections) {
      textEditor.selections = this.searchState.startSelections;
    }
    MessageManager.showMessage("Quit");
    revealPrimaryActive(textEditor);
    return vscode.commands.executeCommand("closeFindWidget");
  }
}

/**
 * Enter, etc
 */
export class IsearchExit extends IsearchCommand {
  public readonly id = "isearchExit";

  public run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
    args?: unknown[],
  ): Thenable<void> {
    return vscode.commands.executeCommand("closeFindWidget").then(() => {
      const startSelections = this.searchState.startSelections;
      if (startSelections) {
        if (isInMarkMode) {
          // Restore the mark mode selections
          textEditor.selections = textEditor.selections.map((selection, index) => {
            const startSelection = startSelections[index];
            if (startSelection == null) {
              return selection;
            }
            return new vscode.Selection(startSelection.anchor, selection.active);
          });
        } else {
          this.emacsController.pushMark(startSelections.map((selection) => selection.anchor));
          MessageManager.showMessage("Mark saved where search started");
        }
      }

      const arg0 = args?.[0];
      const maybeNextCommand = (arg0 as { then?: string } | undefined)?.then;
      const nextCommand = typeof maybeNextCommand === "string" ? maybeNextCommand : undefined;
      if (nextCommand) {
        return vscode.commands.executeCommand(nextCommand);
      }
    });
  }
}
