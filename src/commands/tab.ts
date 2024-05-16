import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { makeParallel, EmacsCommand } from ".";

const offsideRuleLanguageIds = ["python"];

export class TabToTabStop extends EmacsCommand {
  public readonly id = "tabToTabStop";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    if (offsideRuleLanguageIds.includes(textEditor.document.languageId)) {
      const tabSize = textEditor.options.tabSize as number;
      const insertSpaces = textEditor.options.insertSpaces as boolean;

      const indentChars = insertSpaces ? tabSize : 1;

      const editsAndMoves = textEditor.selections.map((selection) => {
        let prevNonEmptyLine: vscode.TextLine | undefined;
        for (let i = selection.active.line - 1; i >= 0; i--) {
          const line = textEditor.document.lineAt(i);
          if (line.isEmptyOrWhitespace) {
            continue;
          }
          prevNonEmptyLine = line;
          break;
        }
        const prevIndentChars = prevNonEmptyLine?.firstNonWhitespaceCharacterIndex;
        const newIndentUnits = prevIndentChars != null ? Math.floor(prevIndentChars / tabSize) + 1 : 0;
        const newIndentChars = newIndentUnits * indentChars;

        const curLine = textEditor.document.lineAt(selection.active.line);
        const charsToInsert = Math.max(newIndentChars - curLine.firstNonWhitespaceCharacterIndex, 0);
        const charsToMoveCurAfterIndent = Math.max(
          selection.active.character - curLine.firstNonWhitespaceCharacterIndex,
          0,
        );

        return {
          line: selection.active.line,
          charsToInsert,
          cursorChars: newIndentChars + charsToMoveCurAfterIndent,
        };
      });

      const indentChar = insertSpaces ? " " : "\t";
      textEditor.edit((editBuilder) => {
        editsAndMoves.forEach((editAndMove) => {
          const lineHead = new vscode.Position(editAndMove.line, 0);
          editBuilder.insert(lineHead, indentChar.repeat(editAndMove.charsToInsert));
        });
      });
      textEditor.selections = editsAndMoves.map((editAndMove) => {
        const active = new vscode.Position(editAndMove.line, editAndMove.cursorChars);
        return new vscode.Selection(active, active);
      });
      this.emacsController.exitMarkMode();
    }

    // A single call of `editor.action.reindentselectedlines`
    // only affects a first selection which has a not indented line.
    // So we need to call it as many times as the number of selections.
    return makeParallel(textEditor.selections.length, () =>
      vscode.commands.executeCommand("editor.action.reindentselectedlines"),
    ).then(() => {
      textEditor.selections = textEditor.selections.map((selection) => {
        const indentHeadChar = textEditor.document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
        if (selection.active.character > indentHeadChar) {
          return new Selection(selection.active, selection.active);
        }
        const indentHeadPos = new vscode.Position(selection.active.line, indentHeadChar);
        return new Selection(indentHeadPos, indentHeadPos);
      });
      this.emacsController.exitMarkMode();
    });
  }
}
