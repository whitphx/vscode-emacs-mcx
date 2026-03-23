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

export class JustOneSpace extends EmacsCommand {
  public readonly id = "justOneSpace";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const n = prefixArgument === undefined ? 1 : prefixArgument;
    const includeNewlines = n < 0;
    const spacesToLeave = Math.abs(n);

    const doc = textEditor.document;
    const docLength = doc.getText().length;

    // Compute the whitespace range for each cursor, tracking its original index.
    const perCursorInfos = textEditor.selections.map((selection, index) => {
      const offset = doc.offsetAt(selection.active);

      let fromOffset = offset;
      while (fromOffset > 0) {
        const ch = doc.getText(new Range(doc.positionAt(fromOffset - 1), doc.positionAt(fromOffset)));
        if (ch === " " || ch === "\t" || (includeNewlines && (ch === "\n" || ch === "\r"))) {
          fromOffset -= 1;
        } else {
          break;
        }
      }

      let toOffset = offset;
      while (toOffset < docLength) {
        const ch = doc.getText(new Range(doc.positionAt(toOffset), doc.positionAt(toOffset + 1)));
        if (ch === " " || ch === "\t" || (includeNewlines && (ch === "\n" || ch === "\r"))) {
          toOffset += 1;
        } else {
          break;
        }
      }

      return { index, fromOffset, toOffset };
    });

    // Sort by document position, then merge overlapping ranges.
    // textEditor.selections is not guaranteed to be in document order
    // (primary selection is always at index 0), and multiple cursors
    // in the same whitespace span produce identical ranges that VSCode
    // would reject as overlapping edits.
    const sorted = perCursorInfos.slice().sort((a, b) => a.fromOffset - b.fromOffset);
    const mergedEdits: { fromOffset: number; toOffset: number; selectionIndexes: number[] }[] = [];
    for (const info of sorted) {
      const last = mergedEdits.at(-1);
      if (last != null && info.fromOffset <= last.toOffset) {
        last.toOffset = Math.max(last.toOffset, info.toOffset);
        last.selectionIndexes.push(info.index);
      } else {
        mergedEdits.push({
          fromOffset: info.fromOffset,
          toOffset: info.toOffset,
          selectionIndexes: [info.index],
        });
      }
    }

    return textEditor
      .edit((editBuilder) => {
        mergedEdits.forEach(({ fromOffset, toOffset }) => {
          const from = doc.positionAt(fromOffset);
          const to = doc.positionAt(toOffset);
          editBuilder.replace(new Range(from, to), " ".repeat(spacesToLeave));
        });
      })
      .then((success) => {
        if (!success) {
          logger.warn("justOneSpace failed");
          return;
        }

        // Compute the new cursor offset for each original selection.
        const cursorOffsets = new Array<number>(perCursorInfos.length);
        let cumulativeShift = 0;
        for (const { fromOffset, toOffset, selectionIndexes } of mergedEdits) {
          const newCursorOffset = fromOffset + spacesToLeave + cumulativeShift;
          for (const i of selectionIndexes) {
            cursorOffsets[i] = newCursorOffset;
          }
          cumulativeShift += spacesToLeave - (toOffset - fromOffset);
        }

        textEditor.selections = cursorOffsets.map((offset) => {
          const pos = textEditor.document.positionAt(offset);
          return new Selection(pos, pos);
        });
      });
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
