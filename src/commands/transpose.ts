import { Position, Selection, TextEditor, EndOfLine } from "vscode";
import { EmacsCommand } from ".";
import { MessageManager } from "../message";

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

    const outOfBoundsLines = transposeLineNumPairs.some(({ to }) => to < 0);
    if (outOfBoundsLines) {
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
