import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { delay } from "../utils";

export class DeleteBackwardChar extends EmacsCommand {
  public readonly id = "deleteBackwardChar";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () => vscode.commands.executeCommand("deleteLeft"));
  }
}

export class DeleteForwardChar extends EmacsCommand {
  public readonly id = "deleteForwardChar";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>("deleteRight"),
    ) as Thenable<unknown> as Thenable<void>;
  }
}

export class NewLine extends EmacsCommand {
  public readonly id = "newLine";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    this.emacsController.exitMarkMode();

    textEditor.selections = textEditor.selections.map((selection) => new Selection(selection.active, selection.active));

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;

    if (repeat <= 0) {
      return;
    }
    if (repeat === 1) {
      return vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    }

    // We don't use a combination of `createParallel` and `vscode.commands.executeCommand("default:type", { text: "\n" })`
    // here because it doesn't work well with undo/redo pushing multiple edits into the undo stack.
    // Instead, we use `textEditor.edit` to push a single edit into the undo stack.
    // To do so, we first call the `default:type` command twice to insert two new lines
    // and record the inserted texts.
    // Then undo these two edits and call `textEditor.edit` to insert the repeated texts at once.

    const initCursorsAtEndOfLine = textEditor.selections.map((selection) => {
      return selection.active.isEqual(textEditor.document.lineAt(selection.active.line).range.end);
    });

    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    await delay(6); // Wait for code completion to finish. The value is ad-hoc.
    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });

    const eol = textEditor.document.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";

    const firstInsertedTexts = textEditor.selections.map((selection) => {
      return eol + textEditor.document.lineAt(selection.active.line - 1).text;
    });
    const secondInsertedTexts = textEditor.selections.map((selection) => {
      return eol + textEditor.document.lineAt(selection.active.line).text;
    });

    // Trailing new lines can be inserted for example
    // when the cursor is inside a multi-line comment in JS like below.
    // /**| */
    // ↓
    // /**
    //  * |
    //  */
    // This `trailingNewLinesInserted` flag represents whether such trailing new lines are inserted.
    const trailingNewLinesInserted = textEditor.selections.map((selection, index) => {
      const initCursorAtEndOfLine = initCursorsAtEndOfLine[index];
      if (initCursorAtEndOfLine == undefined || initCursorAtEndOfLine === true) {
        return false;
      }
      const cursorAtEndOfLine = selection.active.isEqual(textEditor.document.lineAt(selection.active.line).range.end);
      return cursorAtEndOfLine;
    });

    await vscode.commands.executeCommand<void>("undo");
    await vscode.commands.executeCommand<void>("undo");

    await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection, index) => {
        const firstInsertedLineText = firstInsertedTexts[index];
        const secondInsertedLineText = secondInsertedTexts[index];
        const trailingNewLineInserted = trailingNewLinesInserted[index];
        if (firstInsertedLineText == null) {
          throw new Error("firstInsertedLineText is null");
        }
        if (secondInsertedLineText == null) {
          throw new Error("secondInsertedLineText is null");
        }
        editBuilder.insert(
          selection.active,
          firstInsertedLineText.repeat(repeat - 1) + secondInsertedLineText + (trailingNewLineInserted ? eol : ""),
        );
      });
    });
    textEditor.selections = textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted) {
        const newActive = textEditor.document.lineAt(selection.active.line - 1).range.end;
        return new Selection(newActive, newActive);
      }
      return selection;
    });

    revealPrimaryActive(textEditor);
  }
}
