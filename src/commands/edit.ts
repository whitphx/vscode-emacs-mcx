import * as vscode from "vscode";
import { Range, Selection, TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";
import { revealPrimaryActive } from "./helpers/reveal";

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
    // record the inserted texts.
    // Then undo these two edits and call `textEditor.edit` to insert the repeated texts at once.
    const initialPositions = textEditor.selections.map((selection) => selection.active);

    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    const firstEditPositions = textEditor.selections.map((selection) => selection.active);
    const firstInsertedTexts = firstEditPositions.map((position, index) => {
      const initialPosition = initialPositions[index];
      if (initialPosition == null) {
        throw new Error("initialPosition is null");
      }
      const range = new Range(initialPosition, position);
      return textEditor.document.getText(range);
    });

    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    const secondEditPositions = textEditor.selections.map((selection) => selection.active);
    const secondInsertedTexts = secondEditPositions.map((position, index) => {
      const firstEditPosition = firstEditPositions[index];
      if (firstEditPosition == null) {
        throw new Error("firstEditPosition is null");
      }
      const range = new Range(firstEditPosition, position);
      return textEditor.document.getText(range);
    });

    await vscode.commands.executeCommand<void>("undo");
    await vscode.commands.executeCommand<void>("undo");

    await textEditor
      .edit((editBuilder) => {
        textEditor.selections.forEach((selection, index) => {
          const firstInsertedText = firstInsertedTexts[index];
          const secondInsertedText = secondInsertedTexts[index];
          if (firstInsertedText == null) {
            throw new Error("firstInsertedText is null");
          }
          if (secondInsertedText == null) {
            throw new Error("secondInsertedText is null");
          }
          editBuilder.insert(selection.active, firstInsertedText.repeat(repeat - 1) + secondInsertedText);
        });
      })
      .then();

    revealPrimaryActive(textEditor);
  }
}
