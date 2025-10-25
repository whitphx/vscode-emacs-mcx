import * as vscode from "vscode";
import { Range, Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { makeParallel } from "./helpers/parallel";
import { makeSelectionsEmpty } from "./helpers/selection";
import { revealPrimaryActive } from "./helpers/reveal";
import { delay } from "../utils";
import { Logger } from "../logger";

const logger = Logger.get("EditCommands");

export class DeleteBackwardChar extends EmacsCommand {
  public readonly id = "deleteBackwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () => vscode.commands.executeCommand("deleteLeft"));
  }
}

export class DeleteForwardChar extends EmacsCommand {
  public readonly id = "deleteForwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () =>
      vscode.commands.executeCommand<void>("deleteRight"),
    ) as Thenable<unknown> as Thenable<void>;
  }
}

export class DeleteHorizontalSpace extends EmacsCommand {
  public readonly id = "deleteHorizontalSpace";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const onlyBefore = prefixArgument === undefined ? false : prefixArgument > 0;
    return textEditor
      .edit((editBuilder) => {
        textEditor.selections.forEach((selection) => {
          const line = selection.active.line;

          let from = selection.active.character;
          while (from > 0) {
            const char = textEditor.document.getText(new Range(line, from - 1, line, from));
            if (char !== " " && char !== "\t") {
              break;
            }
            from -= 1;
          }

          let to = selection.active.character;
          if (!onlyBefore) {
            const lineEnd = textEditor.document.lineAt(line).range.end.character;
            while (to < lineEnd) {
              const char = textEditor.document.getText(new Range(line, to, line, to + 1));
              if (char !== " " && char !== "\t") {
                break;
              }
              to += 1;
            }
          }

          editBuilder.delete(new Range(line, from, line, to));
        });
      })
      .then((success) => {
        if (!success) {
          logger.warn("deleteHorizontalSpace failed");
        }
      })
      .then(() => {
        makeSelectionsEmpty(textEditor);
      });
  }
}

export class CycleSpacing extends EmacsCommand {
  public readonly id = "cycleSpacing";

  private cycleState = 0; // 0: one space, 1: no space, 2: restore
  private originalSpacing: Array<{ before: string; after: string; from: number }> = [];
  private latestTextEditor: TextEditor | null = null;
  private latestSelections: readonly vscode.Selection[] = [];

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    // Check if this is a continuation of the previous cycle-spacing call
    const isContinuation =
      this.latestTextEditor === textEditor &&
      this.latestSelections.length === textEditor.selections.length &&
      this.latestSelections.every((latestSelection, i) => {
        const activeSelection = textEditor.selections[i];
        return activeSelection && latestSelection.isEqual(activeSelection);
      });

    if (!isContinuation) {
      // Start a new cycle
      this.cycleState = 0;
      this.originalSpacing = [];
    }

    const currentState = this.cycleState;

    return textEditor
      .edit((editBuilder) => {
        textEditor.selections.forEach((selection, index) => {
          const line = selection.active.line;
          const lineText = textEditor.document.lineAt(line).text;
          const cursorChar = selection.active.character;

          if (currentState === 0 || currentState === 1) {
            // Find the range of spaces/tabs around the cursor for states 0 and 1
            let from = cursorChar;
            while (from > 0) {
              const char = lineText[from - 1];
              if (char !== " " && char !== "\t") {
                break;
              }
              from -= 1;
            }

            let to = cursorChar;
            const lineEnd = lineText.length;
            while (to < lineEnd) {
              const char = lineText[to];
              if (char !== " " && char !== "\t") {
                break;
              }
              to += 1;
            }

            // Store original spacing on first call of the cycle
            if (currentState === 0) {
              const beforeSpacing = lineText.substring(from, cursorChar);
              const afterSpacing = lineText.substring(cursorChar, to);
              this.originalSpacing[index] = { before: beforeSpacing, after: afterSpacing, from };
            }

            const range = new Range(line, from, line, to);

            if (currentState === 0) {
              // First call: delete all but one space
              editBuilder.replace(range, " ");
            } else {
              // Second call: delete all spaces
              editBuilder.delete(range);
            }
          } else {
            // Third call (state 2): restore original spacing
            const original = this.originalSpacing[index];
            if (original) {
              // Always use insert at the original position
              editBuilder.insert(new vscode.Position(line, original.from), original.before + original.after);
            }
          }
        });
      })
      .then((success) => {
        if (!success) {
          logger.warn("cycleSpacing failed");
        }
      })
      .then(() => {
        // Update cursor positions based on the state
        textEditor.selections = textEditor.selections.map((selection, index) => {
          const line = selection.active.line;
          const original = this.originalSpacing[index];

          if (currentState === 0) {
            // After replacing with one space, cursor should be after the space
            if (original) {
              const newPos = new vscode.Position(line, original.from + 1);
              return new Selection(newPos, newPos);
            }
          } else if (currentState === 1) {
            // After deleting all spaces, cursor at the position where spaces were
            if (original) {
              const newPos = new vscode.Position(line, original.from);
              return new Selection(newPos, newPos);
            }
          } else {
            // After restoring original spacing, place cursor at original position
            if (original) {
              const newPos = new vscode.Position(line, original.from + original.before.length);
              return new Selection(newPos, newPos);
            }
          }
          return new Selection(selection.active, selection.active);
        });

        // Advance to next state and save the state for interruption checking
        this.cycleState = (this.cycleState + 1) % 3;
        this.latestTextEditor = textEditor;
        this.latestSelections = textEditor.selections;
      });
  }

  public onDidInterruptTextEditor(): void {
    // Check if the interruption was caused by this command's own changes
    const interruptedBySelf =
      this.latestTextEditor === vscode.window.activeTextEditor &&
      this.latestSelections.every((latestSelection, i) => {
        const activeSelection = vscode.window.activeTextEditor?.selections[i];
        return activeSelection && latestSelection.isEqual(activeSelection);
      });

    if (!interruptedBySelf) {
      // Reset state only if interrupted by another command
      this.cycleState = 0;
      this.originalSpacing = [];
      this.latestTextEditor = null;
      this.latestSelections = [];
    }
  }
}

export class NewLine extends EmacsCommand {
  public readonly id = "newLine";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
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
    await delay(33); // Wait for code completion to finish. The value is ad-hoc.
    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });

    // The first inserted lines can be affected by the second ones.
    // We need to capture its final content after the second insertion to achieve the desired result.
    const firstInsertedTexts = textEditor.selections.map((selection) => {
      const from = textEditor.document.lineAt(selection.active.line - 2).range.end;
      const to = textEditor.document.lineAt(selection.active.line - 1).range.end;
      return textEditor.document.getText(new Range(from, to));
    });
    const secondInsertedTexts = textEditor.selections.map((selection) => {
      const from = textEditor.document.lineAt(selection.active.line - 1).range.end;
      const to = textEditor.document.lineAt(selection.active.line - 0).range.end;
      return textEditor.document.getText(new Range(from, to));
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
    const trailingNewLinesInserted = textEditor.selections.map((selection, index) => {
      const initCursorAtEndOfLine = initCursorsAtEndOfLine[index];
      if (initCursorAtEndOfLine == null || initCursorAtEndOfLine === true) {
        return false;
      }
      const cursorAtEndOfLine = selection.active.isEqual(textEditor.document.lineAt(selection.active.line).range.end);
      return cursorAtEndOfLine;
    });
    const trailingLineTexts = textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted == null || trailingNewLineInserted === false) {
        return "";
      }
      const nextLineStart = textEditor.document.lineAt(selection.active.line + 1).range.start;
      return textEditor.document.getText(new Range(selection.active, nextLineStart));
    });

    await vscode.commands.executeCommand<void>("undo");
    await vscode.commands.executeCommand<void>("undo");

    await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection, index) => {
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
