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

    const doc = textEditor.document;

    // Group selections by line to handle multi-cursor on same line
    const selectionsByLine = new Map<number, Selection[]>();
    for (const selection of textEditor.selections) {
      const lineNum = selection.active.line;
      if (!selectionsByLine.has(lineNum)) {
        selectionsByLine.set(lineNum, []);
      }
      selectionsByLine.get(lineNum)!.push(selection);
    }

    const newSelections: Selection[] = [];

    await textEditor.edit((editBuilder) => {
      for (const [lineNum, selections] of selectionsByLine) {
        const line = doc.lineAt(lineNum);
        let lineText = line.text;

        // Track which character indices to swap
        const swaps: Array<{ index1: number; index2: number; newPos: number }> = [];
        const crossLineTranspose: Array<{ selection: Selection; newPos: number }> = [];

        for (const selection of selections) {
          const pos = selection.active;

          // At the very beginning of the document, do nothing
          if (pos.line === 0 && pos.character === 0) {
            newSelections.push(selection);
            continue;
          }

          // Cross-line transpose at beginning of non-first line
          if (pos.character === 0 && pos.line > 0 && offset === 1) {
            const prevLine = doc.lineAt(pos.line - 1);
            const prevLineText = prevLine.text;

            if (lineText.length === 0) {
              // Current line is empty: move last char of previous line to current line
              if (prevLineText.length === 0) {
                // Both lines are empty: cannot transpose
                newSelections.push(selection);
                continue;
              }

              const lastCharOfPrevLine = prevLineText[prevLineText.length - 1]!;

              // Remove last char from previous line
              const newPrevLineText = prevLineText.substring(0, prevLineText.length - 1);
              editBuilder.replace(prevLine.range, newPrevLineText);

              // Add it to current (empty) line
              const newCurLineText = lastCharOfPrevLine;
              editBuilder.replace(line.range, newCurLineText);
              lineText = newCurLineText; // Update for subsequent selections on same line

              // Cursor moves to position 1 (after the moved character)
              crossLineTranspose.push({ selection, newPos: 1 });
              continue;
            } else {
              // Current line is non-empty: move first char to end of previous line
              const firstCharOfCurLine = lineText[0]!;

              // Add first char of current line to end of previous line
              const newPrevLineText = prevLineText + firstCharOfCurLine;
              editBuilder.replace(prevLine.range, newPrevLineText);

              // Remove first character from current line
              const newCurLineText = lineText.substring(1);
              editBuilder.replace(line.range, newCurLineText);
              lineText = newCurLineText; // Update for subsequent selections on same line

              // Cursor stays at position 0
              crossLineTranspose.push({ selection, newPos: 0 });
              continue;
            }
          }

          // Cannot transpose if line is too short
          if (lineText.length < 2) {
            newSelections.push(selection);
            continue;
          }

          let charIndex: number;
          let swapWithIndex: number;

          if (offset > 0) {
            // Forward transpose
            if (pos.character === 0) {
              // At beginning of line (but offset != 1 or line == 0): transpose first two characters
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
              // At beginning: cannot transpose backward within line
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

          // Calculate new cursor position
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

          swaps.push({ index1: charIndex, index2: swapWithIndex, newPos: newCharPos });
        }

        // Apply all swaps to the line if there are any
        if (swaps.length > 0 && crossLineTranspose.length === 0) {
          const chars = lineText.split("");

          // Apply all swaps
          for (const swap of swaps) {
            const temp = chars[swap.index1]!;
            chars[swap.index1] = chars[swap.index2]!;
            chars[swap.index2] = temp;
          }

          const newLineText = chars.join("");
          editBuilder.replace(line.range, newLineText);

          // Add new selections
          for (const swap of swaps) {
            const newPos = new Position(lineNum, Math.min(swap.newPos, newLineText.length));
            newSelections.push(new Selection(newPos, newPos));
          }
        }

        // Add cross-line transpose selections
        for (const { newPos } of crossLineTranspose) {
          const pos = new Position(lineNum, newPos);
          newSelections.push(new Selection(pos, pos));
        }
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
