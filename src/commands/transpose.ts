import { Position, Range, Selection, TextEditor, TextEditorEdit, EndOfLine } from "vscode";
import { EmacsCommand } from ".";
import { MessageManager } from "../message";
import * as vscode from "vscode";

// Typescript translation of transpose-internal in simple.el.
//
// Arg `mover` is a function that moves the cursor.
async function transposeInternal(
  textEditor: TextEditor,
  mover: (prefixArgument: number) => Promise<void>,
  prefixArgument: number | undefined,
): Promise<void> {
  // Invokes the mover and returns the [start, end] range of a
  // region to transpose, for each selection.
  const aux = async (prefixArgument: number): Promise<Range[]> => {
    await mover(prefixArgument);
    const endPositions = textEditor.selections.map((s) => s.active);
    await mover(-prefixArgument);
    const startPositions = textEditor.selections.map((s) => s.active);

    const ranges: Range[] = [];
    for (let i = 0; i < Math.min(startPositions.length, endPositions.length); i++) {
      const start = startPositions[i] as Position;
      const end = endPositions[i] as Position;
      ranges.push(start.isAfter(end) ? new Range(end, start) : new Range(start, end));
    }
    return ranges;
  };

  // Transpose each char/word/line in pos1 and pos2.
  const subr1 = async (pos1: Range[], pos2: Range[]): Promise<void> => {
    await textEditor.edit((edit: TextEditorEdit) => {
      for (let i = 0; i < Math.min(pos1.length, pos2.length); i++) {
        let p1 = pos1[i] as Range;
        let p2 = pos2[i] as Range;
        if (p1.start.isAfter(p2.start)) {
          [p1, p2] = [p2, p1];
        }
        if (!p1.end.isAfter(p2.start)) {
          const text1 = textEditor.document.getText(p1);
          const text2 = textEditor.document.getText(p2);
          edit.delete(new Selection(p1.start, p1.end));
          edit.delete(new Selection(p2.start, p2.end));
          edit.insert(p1.start, text2);
          edit.insert(p2.start, text1);
        }
      }
    });
  };

  if (prefixArgument === undefined || prefixArgument >= 0) {
    // Find the char/word/line(s) before the point.
    const pos1 = await aux(-1);
    // Find the char/word/line(s) after the point.
    const pos2 = await aux(prefixArgument ?? 1);
    await subr1(pos1, pos2);
  } else {
    const pos1 = await aux(-1);

    // Move the active position to the start of the range(s).
    {
      const newSelections: Selection[] = [];
      for (let i = 0; i < textEditor.selections.length; i++) {
        const selection = textEditor.selections[i]!;
        const range = pos1[i];
        newSelections.push(new Selection(range?.start ?? selection.anchor, range?.start ?? selection.active));
      }
      textEditor.selections = newSelections;
    }
    const pos2 = await aux(prefixArgument);
    await subr1(pos1, pos2);

    // Move the active position to the start of the range(s).
    {
      const newSelections: Selection[] = [];
      for (let i = 0; i < textEditor.selections.length; i++) {
        const selection = textEditor.selections[i]!;
        const r1 = pos1[i];
        const r2 = pos2[i];
        if (r2 === undefined) {
          // shouldn't happen.
          newSelections.push(selection);
          continue;
        }
        const delta = r1 ? textEditor.document.offsetAt(r1.end) - textEditor.document.offsetAt(r1.start) : 0;
        const offset = r2 ? textEditor.document.offsetAt(r2.start) : 0;
        const newPosition = textEditor.document.positionAt(offset + delta);
        newSelections.push(new Selection(newPosition, newPosition));
      }
      textEditor.selections = newSelections;
    }
  }
}

export class TransposeChars extends EmacsCommand {
  public readonly id = "transposeChars";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const transposeOffset = prefixArgument == null ? 1 : prefixArgument;

    if (transposeOffset === 0) {
      return;
    }

    const doc = textEditor.document;

    const uniqueActives = [...new Set(textEditor.selections.map((s) => s.active))].sort((a, b) => {
      if (a.line === b.line) {
        return a.character - b.character;
      }
      return a.line - b.line;
    });

    const newActiveOffsets: number[] = [];
    for (const active of uniqueActives) {
      const docLastOffset = doc.offsetAt(doc.lineAt(doc.lineCount - 1).range.end);

      const activeLine = doc.lineAt(active.line);
      const activeOffset = doc.offsetAt(active);
      const fromOffset = Math.max((active.isEqual(activeLine.range.end) ? activeOffset - 1 : activeOffset) - 1, -1);
      const toOffset = fromOffset + transposeOffset;

      if (toOffset === fromOffset) {
        return;
      }

      if (fromOffset < 0 || toOffset < 0) {
        await this.emacsController.runCommand("beginningOfBuffer");
        return;
      }

      if (fromOffset > docLastOffset || toOffset > docLastOffset) {
        await this.emacsController.runCommand("endOfBuffer");
        return;
      }

      newActiveOffsets.push(toOffset + 1);
      const fromChar = doc.getText(new Selection(doc.positionAt(fromOffset), doc.positionAt(fromOffset + 1)));
      await textEditor.edit((editBuilder) => {
        const toInsertPos = doc.positionAt(fromOffset < toOffset ? toOffset + 1 : toOffset);
        editBuilder.insert(toInsertPos, fromChar);
        editBuilder.delete(new Selection(doc.positionAt(fromOffset), doc.positionAt(fromOffset + 1)));
      });
    }

    this.emacsController.exitMarkMode();
    textEditor.selections = newActiveOffsets.map((activeOffset) => {
      const newActive = doc.positionAt(activeOffset);
      return new Selection(newActive, newActive);
    });
  }
}

export class TransposeLines extends EmacsCommand {
  public readonly id = "transposeLines";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const targetOffset = prefixArgument == null ? 1 : prefixArgument;

    // Get unique line numbers to transpose, sorted from top to bottom
    // Process top-to-bottom so adjacent line transposes cascade correctly
    // When on line 0, treat it as line 1 (swap lines 0 and 1, cursor moves to line 2)
    const currentLineNumbers = [
      ...new Set(textEditor.selections.map((s) => (s.active.line === 0 ? 1 : s.active.line))),
    ].sort((a, b) => a - b);

    const transposeLineNumPairs = currentLineNumbers.map((lineNum) => {
      const from = lineNum - 1;
      const to = from + targetOffset;
      return {
        from,
        to,
      };
    });

    const hasNegativeLineNumbers = transposeLineNumPairs.some(({ to }) => to < 0);
    if (hasNegativeLineNumbers) {
      MessageManager.showMessage("Don't have two things to transpose");
      return;
    }

    // Process each line sequentially from top to bottom
    const eol = textEditor.document.eol === EndOfLine.LF ? "\n" : "\r\n";
    for (const { from, to } of transposeLineNumPairs) {
      await textEditor.edit((editBuilder) => {
        const doc = textEditor.document;

        // Validate only beginning bounds (negative indices)
        if (from < 0 || to < 0) {
          return;
        }

        // No-op if same line
        if (from === to) {
          return;
        }

        const fromLine = doc.lineAt(from);
        const fromText = fromLine.text;

        // Whether the original line had a trailing EOL
        const fromHadEol = from !== doc.lineCount - 1;

        // Insert the line at the target location (do not exchange)
        if (to < doc.lineCount) {
          if (to < from) {
            const insertPos = doc.lineAt(to).range.start;
            editBuilder.insert(insertPos, fromText + eol);
          } else {
            const insertPos = doc.lineAt(to).range.end;
            editBuilder.insert(insertPos, eol + fromText);
          }
        } else {
          // to is beyond document end: append eol(s) to create empty lines up to `to`, then the moved line
          const lastEnd = doc.lineAt(doc.lineCount - 1).range.end;
          const eolCount = to - (doc.lineCount - 1); // number of EOLs to place before the moved text
          const insertText = eol.repeat(eolCount) + fromText + (fromHadEol ? eol : "");
          editBuilder.insert(lastEnd, insertText);
        }

        // Remove the original line
        editBuilder.delete(fromLine.rangeIncludingLineBreak);
      });
    }

    this.emacsController.exitMarkMode();
    textEditor.selections = transposeLineNumPairs.map(({ to }) => {
      // Cursor moves to the beginning of the next line after transpose
      const newLine = to + 1;
      const newActive = new Position(newLine, 0);
      return new Selection(newActive, newActive);
    });
  }
}

export class TransposeWords extends EmacsCommand {
  public readonly id = "transposeWords";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const mover = async (prefixArgument: number) => {
      if (prefixArgument > 0) {
        await vscode.commands.executeCommand<void>("emacs-mcx.forwardWord", { prefixArgument: prefixArgument });
      } else {
        await vscode.commands.executeCommand<void>("emacs-mcx.backwardWord", { prefixArgument: -prefixArgument });
      }
    };
    await transposeInternal(textEditor, mover, prefixArgument);
  }
}
