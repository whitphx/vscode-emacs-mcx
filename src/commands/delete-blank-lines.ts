import { Position, Range } from "vscode";
import { EmacsCommand } from ".";

export class DeleteBlankLines extends EmacsCommand {
  public readonly id = "deleteBlankLines";

  public async run(prefixArgument: number | undefined): Promise<void> {
    const document = this.emacsController.textEditor.document;

    for (let iSel = 0; iSel < this.emacsController.textEditor.selections.length; ++iSel) {
      // `selection[iSel]` is mutated during the loop,
      // therefore, each selection must be obtained
      // by indexing on each iteration.
      // That's why for-of loop is not appropriate here.
      const selection = this.emacsController.textEditor.selections[iSel]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

      const curLineNum = selection.active.line;
      const curLine = document.lineAt(curLineNum);
      const subsequentText = curLine.text.substr(selection.active.character);

      const cursorIsAtTheEndOfLine = subsequentText.search(/\S/) === -1;
      if (!cursorIsAtTheEndOfLine) {
        break;
      }

      // Search for the following empty lines and get the final line number
      let followingLineOffset = 0;
      while (
        curLineNum + followingLineOffset + 1 < document.lineCount &&
        document.lineAt(curLineNum + followingLineOffset + 1).isEmptyOrWhitespace
      ) {
        followingLineOffset++;
      }

      // Search for the previous empty lines and get the first line number
      let previousLineOffset = 0;
      while (
        curLineNum - previousLineOffset - 1 >= 0 &&
        document.lineAt(curLineNum - previousLineOffset - 1).isEmptyOrWhitespace
      ) {
        previousLineOffset++;
      }

      await this.emacsController.textEditor.edit((editBuilder) => {
        if (followingLineOffset > 0) {
          // Following empty lines exist
          const finalFollowingEmptyLineNum = curLineNum + followingLineOffset;

          editBuilder.delete(
            new Range(
              new Position(curLineNum + 1, 0),
              document.lineAt(finalFollowingEmptyLineNum).rangeIncludingLineBreak.end,
            ),
          );
        }

        if (previousLineOffset > 0) {
          // Previous empty lines exist
          const firstPreviousEmptyLineNum = curLineNum - previousLineOffset;

          editBuilder.delete(
            new Range(
              new Position(firstPreviousEmptyLineNum, 0),
              document.lineAt(curLineNum - 1).rangeIncludingLineBreak.end,
            ),
          );
        }
      });
    }
  }
}
