import { Position, Range, TextEditor } from "vscode";

export async function deleteBlankLines(textEditor: TextEditor) {
    const document = textEditor.document;

    // tslint:disable-next-line:prefer-for-of
    for (let iSel = 0; iSel < textEditor.selections.length; ++iSel) {
        // `selection[iSel]` is mutated during the loop,
        // therefore, each selection must be obtained
        // by indexing on each iteration.
        // That's why for-of loop is not appropriate here.
        const selection = textEditor.selections[iSel];

        const curLineNum = selection.active.line;
        const curLine = document.lineAt(curLineNum);
        const subsequentText = curLine.text.substr(selection.active.character);

        const cursorIsAtTheEndOfLine = subsequentText.search(/\S/) === -1;
        if (!cursorIsAtTheEndOfLine) { break; }

        // Search for the following empty lines and get the final line number
        let followingLineOffset = 0;
        while (curLineNum + followingLineOffset + 1 <document.lineCount &&
            document.lineAt(curLineNum + followingLineOffset + 1).isEmptyOrWhitespace) {
            followingLineOffset++;
        }
        if (followingLineOffset === 0) {
            // No following empty line exists
            break;
        }
        const finalFollowingEmptyLineNum = curLineNum + followingLineOffset;

        await textEditor.edit((editBuilder) => {
            editBuilder.delete(new Range(
                new Position(curLineNum + 1, 0),
                document.lineAt(finalFollowingEmptyLineNum).rangeIncludingLineBreak.end,
            ));
        });
    }
}
