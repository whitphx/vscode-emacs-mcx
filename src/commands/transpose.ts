import { Position, Selection, TextEditor, EndOfLine } from "vscode";
import { EmacsCommand } from ".";
import { MessageManager } from "../message";

export class TransposeChars extends EmacsCommand {
  public readonly id = "transposeChars";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const offset = prefixArgument === undefined ? 1 : prefixArgument;

    if (offset === 0) {
      return;
    }

    // Group selections by line to handle multiple cursors on the same line
    const selectionsByLine = new Map<number, Selection[]>();
    for (const selection of textEditor.selections) {
      const lineNum = selection.active.line;
      if (!selectionsByLine.has(lineNum)) {
        selectionsByLine.set(lineNum, []);
      }
      selectionsByLine.get(lineNum)!.push(selection);
    }

    await textEditor.edit((editBuilder) => {
      const doc = textEditor.document;
      const newSelections: Selection[] = [];

      // Process each line that has selections
      for (const [lineNum, selections] of selectionsByLine) {
        const line = doc.lineAt(lineNum);
        let lineText = line.text;

        // Cannot transpose if line is too short
        if (lineText.length < 2) {
          newSelections.push(...selections);
          continue;
        }

        // Process each selection on this line sequentially
        for (const selection of selections.sort(
          (a: Selection, b: Selection) => a.active.character - b.active.character,
        )) {
          const pos = selection.active;

          let charIndex: number;
          let swapWithIndex: number;

          if (offset > 0) {
            // Forward transpose
            if (pos.character === 0) {
              // At beginning of line: transpose first two characters
              charIndex = 0;
              swapWithIndex = charIndex + offset;
            } else if (pos.character >= lineText.length) {
              // At or beyond end of line: transpose the two characters before point
              charIndex = lineText.length - 2;
              swapWithIndex = charIndex + 1;
            } else {
              // In middle: transpose character before point with character at offset
              charIndex = pos.character - 1;
              swapWithIndex = charIndex + offset;
            }
          } else {
            // Backward transpose (negative offset)
            if (pos.character === 0) {
              // At beginning: cannot transpose backward
              newSelections.push(selection);
              continue;
            } else if (pos.character >= lineText.length) {
              // At or beyond end: transpose backward from last character
              charIndex = lineText.length - 1;
              swapWithIndex = charIndex + offset;
            } else {
              // In middle: transpose character before point backward
              charIndex = pos.character - 1;
              swapWithIndex = charIndex + offset;
            }
          }

          // Check bounds
          if (swapWithIndex < 0 || swapWithIndex >= lineText.length || charIndex === swapWithIndex) {
            newSelections.push(selection);
            continue;
          }

          // Ensure charIndex < swapWithIndex for consistent ordering
          const minIndex = Math.min(charIndex, swapWithIndex);
          const maxIndex = Math.max(charIndex, swapWithIndex);

          const charAtMin = lineText[minIndex];
          const charAtMax = lineText[maxIndex];

          // Build new line text by replacing the two characters
          lineText =
            lineText.substring(0, minIndex) +
            charAtMax +
            lineText.substring(minIndex + 1, maxIndex) +
            charAtMin +
            lineText.substring(maxIndex + 1);

          // Move cursor forward by 1 for positive offset, backward for negative
          let newCharPos: number;
          if (offset > 0) {
            if (pos.character === 0) {
              newCharPos = 2; // After transposing first two chars, move to position 2
            } else if (pos.character >= lineText.length) {
              newCharPos = pos.character; // Stay at end
            } else {
              newCharPos = pos.character + 1; // Move forward
            }
          } else {
            newCharPos = Math.max(0, pos.character - 1); // Move backward
          }

          const newPos = new Position(pos.line, Math.min(newCharPos, lineText.length));
          newSelections.push(new Selection(newPos, newPos));
        }

        // Replace the line once with all transposes applied
        editBuilder.replace(line.range, lineText);
      }

      textEditor.selections = newSelections;
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

    textEditor.selections = transposeLineNumPairs.map(({ to }) => {
      // Cursor moves to the beginning of the next line after transpose
      const newLine = to + 1;
      const newActive = new Position(newLine, 0);
      return new Selection(newActive, newActive);
    });
  }
}
