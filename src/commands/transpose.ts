import { Position, Range, Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class TransposeLines extends EmacsCommand {
  public readonly id = "transposeLines";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    // Get unique line numbers to transpose, sorted from top to bottom
    // Process top-to-bottom so adjacent line transposes cascade correctly
    const lineNumbers = [...new Set(textEditor.selections.map((s) => s.active.line))].sort((a, b) => a - b);

    // Remove line 0 (can't transpose first line)
    const linesToTranspose = lineNumbers.filter((line) => line > 0);

    // Process each line sequentially from top to bottom
    for (const lineNum of linesToTranspose) {
      await textEditor.edit((editBuilder) => {
        const currentLine = textEditor.document.lineAt(lineNum);
        const previousLine = textEditor.document.lineAt(lineNum - 1);

        const currentLineText = currentLine.text;
        const previousLineText = previousLine.text;

        const rangeToReplace = new Range(previousLine.range.start, currentLine.range.end);

        const newText = currentLineText + "\n" + previousLineText;
        editBuilder.replace(rangeToReplace, newText);
      });
    }

    // Update cursor positions - map each original selection to its new position
    const newSelections = textEditor.selections.map((selection) => {
      const currentLineNum = selection.active.line;

      // If this line wasn't transposed (line 0), keep selection as-is
      if (currentLineNum === 0) {
        return selection;
      }

      // Cursor moves to the beginning of the next line after transpose
      const newLine = currentLineNum + 1;
      const newActive = new Position(newLine, 0);

      if (isInMarkMode && !selection.anchor.isEqual(selection.active)) {
        // Adjust the anchor position if it was on one of the transposed lines
        let newAnchor = selection.anchor;
        if (selection.anchor.line === currentLineNum) {
          // Anchor was on current line, which moved to previous line position
          newAnchor = new Position(currentLineNum - 1, selection.anchor.character);
        } else if (selection.anchor.line === currentLineNum - 1) {
          // Anchor was on previous line, which moved to current line position
          newAnchor = new Position(currentLineNum, selection.anchor.character);
        }
        return new Selection(newAnchor, newActive);
      } else {
        return new Selection(newActive, newActive);
      }
    });

    textEditor.selections = newSelections;
  }
}
