import { Position, Range, Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";

export class TransposeLines extends EmacsCommand {
  public readonly id = "transposeLines";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    // Get unique line numbers to transpose, sorted from top to bottom
    // Process top-to-bottom so adjacent line transposes cascade correctly
    // When on line 0, treat it as line 1 (swap lines 0 and 1, cursor moves to line 2)
    const lineNumbers = [...new Set(textEditor.selections.map((s) => (s.active.line === 0 ? 1 : s.active.line)))].sort(
      (a, b) => a - b,
    );

    // Process lines >= 1
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
    // Always create empty selections (collapsed cursors) since the edit will exit mark mode
    const newSelections = textEditor.selections.map((selection) => {
      const currentLineNum = selection.active.line;

      // For line 0, treat it as line 1 (cursor moves to line 2)
      const effectiveLineNum = currentLineNum === 0 ? 1 : currentLineNum;

      // Cursor moves to the beginning of the next line after transpose
      const newLine = effectiveLineNum + 1;
      const newActive = new Position(newLine, 0);

      return new Selection(newActive, newActive);
    });

    textEditor.selections = newSelections;
  }
}
