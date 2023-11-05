import * as vscode from "vscode";
import { Range, Selection } from "vscode";
import { makeParallel, EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";
import { delay } from "../utils";

export class DeleteBackwardChar extends EmacsCommand {
  public readonly id = "deleteBackwardChar";

  public execute(prefixArgument: number | undefined): Thenable<unknown> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () => vscode.commands.executeCommand("deleteLeft"));
  }
}

export class DeleteForwardChar extends EmacsCommand {
  public readonly id = "deleteForwardChar";

  public execute(prefixArgument: number | undefined): Thenable<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () =>
      vscode.commands.executeCommand<void>("deleteRight"),
    ) as Thenable<unknown> as Thenable<void>;
  }
}

export class NewLine extends EmacsCommand {
  public readonly id = "newLine";

  public async execute(prefixArgument: number | undefined): Promise<void> {
    this.emacsController.exitMarkMode();

    this.emacsController.textEditor.selections = this.emacsController.textEditor.selections.map(
      (selection) => new Selection(selection.active, selection.active),
    );

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

    const initCursorsAtEndOfLine = this.emacsController.textEditor.selections.map((selection) => {
      return selection.active.isEqual(this.emacsController.textEditor.document.lineAt(selection.active.line).range.end);
    });

    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    await delay(33); // Wait for code completion to finish. The value is ad-hoc.
    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });

    // The first inserted lines can be affected by the second ones.
    // We need to capture its final content after the second insertion to achieve the desired result.
    const firstInsertedTexts = this.emacsController.textEditor.selections.map((selection) => {
      const from = this.emacsController.textEditor.document.lineAt(selection.active.line - 2).range.end;
      const to = this.emacsController.textEditor.document.lineAt(selection.active.line - 1).range.end;
      return this.emacsController.textEditor.document.getText(new Range(from, to));
    });
    const secondInsertedTexts = this.emacsController.textEditor.selections.map((selection) => {
      const from = this.emacsController.textEditor.document.lineAt(selection.active.line - 1).range.end;
      const to = this.emacsController.textEditor.document.lineAt(selection.active.line - 0).range.end;
      return this.emacsController.textEditor.document.getText(new Range(from, to));
    });

    // Trailing new lines can be inserted for example
    // when the cursor is inside a multi-line comment in JS like below.
    // /**| */
    // ↓
    // /**
    //  * |
    //  */
    // The `trailingNewLinesInserted` flag list represents whether such trailing new lines are inserted or not.
    // `trailingLineTexts` contains the texts of such trailing new lines.
    const trailingNewLinesInserted = this.emacsController.textEditor.selections.map((selection, index) => {
      const initCursorAtEndOfLine = initCursorsAtEndOfLine[index];
      if (initCursorAtEndOfLine == null || initCursorAtEndOfLine === true) {
        return false;
      }
      const cursorAtEndOfLine = selection.active.isEqual(
        this.emacsController.textEditor.document.lineAt(selection.active.line).range.end,
      );
      return cursorAtEndOfLine;
    });
    const trailingLineTexts = this.emacsController.textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted == null || trailingNewLineInserted === false) {
        return "";
      }
      const nextLineStart = this.emacsController.textEditor.document.lineAt(selection.active.line + 1).range.start;
      return this.emacsController.textEditor.document.getText(new Range(selection.active, nextLineStart));
    });

    await vscode.commands.executeCommand<void>("undo");
    await vscode.commands.executeCommand<void>("undo");

    await this.emacsController.textEditor.edit((editBuilder) => {
      this.emacsController.textEditor.selections.forEach((selection, index) => {
        const firstInsertedLineText = firstInsertedTexts[index];
        const secondInsertedLineText = secondInsertedTexts[index];
        const trailingLineText = trailingLineTexts[index];
        if (firstInsertedLineText == null) {
          throw new Error("firstInsertedLineText is null");
        }
        if (secondInsertedLineText == null) {
          throw new Error("secondInsertedLineText is null");
        }
        if (trailingLineText == null) {
          throw new Error("trailingLineText is null");
        }
        editBuilder.insert(
          selection.active,
          firstInsertedLineText.repeat(repeat - 1) + secondInsertedLineText + trailingLineText,
        );
      });
    });
    this.emacsController.textEditor.selections = this.emacsController.textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted) {
        const newActive = this.emacsController.textEditor.document.lineAt(selection.active.line - 1).range.end;
        return new Selection(newActive, newActive);
      }
      return selection;
    });

    revealPrimaryActive(this.emacsController.textEditor);
  }
}
