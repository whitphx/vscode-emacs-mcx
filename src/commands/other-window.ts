import * as vscode from "vscode";
import type { TextEditor } from "vscode";
import { EmacsCommand } from ".";

abstract class CommandInOtherWindow extends EmacsCommand {
  abstract runInOtherWindow(): void | Thenable<void>;

  static toCommandId(index: number): string | undefined {
    switch (index) {
      case 1:
        return "workbench.action.focusFirstEditorGroup";
      case 2:
        return "workbench.action.focusSecondEditorGroup";
      case 3:
        return "workbench.action.focusThirdEditorGroup";
      case 4:
        return "workbench.action.focusFourthEditorGroup";
      case 5:
        return "workbench.action.focusFifthEditorGroup";
      case 6:
        return "workbench.action.focusSixthEditorGroup";
      case 7:
        return "workbench.action.focusSeventhEditorGroup";
      case 8:
        return "workbench.action.focusEighthEditorGroup";
    }
    return undefined;
  }

  static lock = false;

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    /**
     * The current implementation switches the focus among the editor groups
     * to achieve command execution in another editor.
     * However, when another command is executed before this command switches the focus back to the original editor,
     * it can lead to unexpected behavior, such as executing the command in the wrong editor,
     * and it can actually happens for example when the user keeps pressing the key bound to this command.
     * To prevent it, we use a lock to ensure that this command is not executed in parallel with itself.
     */
    if (CommandInOtherWindow.lock) {
      return;
    }
    CommandInOtherWindow.lock = true;

    const currentViewColumn = textEditor.viewColumn;
    if (currentViewColumn == null) {
      return;
    }

    const sortedVisibleTextEditors = vscode.window.visibleTextEditors
      .filter((editor) => editor.viewColumn !== null)
      .sort((a, b) => a.viewColumn! - b.viewColumn!);

    if (sortedVisibleTextEditors.length <= 1) {
      return;
    }
    const nextVisibleTextEditor =
      currentViewColumn === sortedVisibleTextEditors[sortedVisibleTextEditors.length - 1]!.viewColumn
        ? sortedVisibleTextEditors[0]
        : sortedVisibleTextEditors[
            sortedVisibleTextEditors.findIndex((editor) => editor.viewColumn === currentViewColumn) + 1
          ];
    if (nextVisibleTextEditor == null) {
      return;
    }
    const nextViewColumn = nextVisibleTextEditor.viewColumn;
    if (nextViewColumn == null) {
      return;
    }

    const commandId = CommandInOtherWindow.toCommandId(nextViewColumn);
    const revCommandId = CommandInOtherWindow.toCommandId(currentViewColumn);

    if (commandId == null || revCommandId == null) {
      return;
    }

    await vscode.commands
      .executeCommand<void>(commandId)
      .then(() => this.runInOtherWindow())
      .then(() => vscode.commands.executeCommand<void>(revCommandId));

    CommandInOtherWindow.lock = false;
  }
}

export class ScrollOtherWindow extends CommandInOtherWindow {
  public readonly id = "scrollOtherWindow";

  public runInOtherWindow(): void | Thenable<void> {
    return vscode.commands.executeCommand<void>("emacs-mcx.scrollUpCommand");
  }
}

export class ScrollOtherWindowUp extends CommandInOtherWindow {
  public readonly id = "scrollOtherWindowDown";

  public runInOtherWindow(): void | Thenable<void> {
    return vscode.commands.executeCommand<void>("emacs-mcx.scrollDownCommand");
  }
}

export class RecenterOtherWindow extends CommandInOtherWindow {
  public readonly id = "recenterOtherWindow";

  public runInOtherWindow(): void | Thenable<void> {
    return vscode.commands.executeCommand<void>("emacs-mcx.recenterTopBottom");
  }
}
