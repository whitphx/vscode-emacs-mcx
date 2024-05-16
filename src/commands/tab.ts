import * as vscode from "vscode";
import { Selection, TextEditor } from "vscode";
import { makeParallel, EmacsCommand } from ".";

const offsideRuleLanguageIds = ["python"];

export class TabToTabStop extends EmacsCommand {
  public readonly id = "tabToTabStop";

  private latestTextEditor: TextEditor | undefined;
  private latestSelections: readonly vscode.Selection[] = [];
  private latestIndentUnitsArr: readonly (number | undefined)[] = [];

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    if (offsideRuleLanguageIds.includes(textEditor.document.languageId)) {
      const tabSize = textEditor.options.tabSize as number;
      const insertSpaces = textEditor.options.insertSpaces as boolean;

      const indentChars = insertSpaces ? tabSize : 1;

      const indentOps = textEditor.selections.map((selection, i) => {
        let prevNonEmptyLine: vscode.TextLine | undefined;
        for (let i = selection.active.line - 1; i >= 0; i--) {
          const line = textEditor.document.lineAt(i);
          if (line.isEmptyOrWhitespace) {
            continue;
          }
          prevNonEmptyLine = line;
          break;
        }
        const prevLineIndentChars = prevNonEmptyLine?.firstNonWhitespaceCharacterIndex;
        const thisLineMaxIndentUnits = prevLineIndentChars != null ? Math.floor(prevLineIndentChars / tabSize) + 1 : 0;

        const prevIndentUnits = this.latestIndentUnitsArr[i]; // IndentUnits applied in the previous call
        const newIndentUnits =
          prevIndentUnits != null && 0 < prevIndentUnits && prevIndentUnits <= thisLineMaxIndentUnits
            ? prevIndentUnits - 1
            : thisLineMaxIndentUnits;
        const newIndentChars = newIndentUnits * indentChars;

        const thisLine = textEditor.document.lineAt(selection.active.line);
        const charsOffsetAfterIndent = Math.max(
          selection.active.character - thisLine.firstNonWhitespaceCharacterIndex,
          0,
        );

        return {
          line: selection.active.line,
          newIndentUnits,
          newIndentChars,
          newCursorChars: newIndentChars + charsOffsetAfterIndent,
        };
      });

      // Update the indents
      const indentChar = insertSpaces ? " " : "\t";
      textEditor.edit((editBuilder) => {
        indentOps.forEach((indentOp) => {
          const line = textEditor.document.lineAt(indentOp.line);
          const lineHead = line.range.start;
          const charsToInsertOrDelete = indentOp.newIndentChars - line.firstNonWhitespaceCharacterIndex;
          if (charsToInsertOrDelete >= 0) {
            editBuilder.insert(lineHead, indentChar.repeat(charsToInsertOrDelete));
          } else {
            editBuilder.delete(new vscode.Range(lineHead, new vscode.Position(indentOp.line, -charsToInsertOrDelete)));
          }
        });
      });
      // Update the cursor positions
      textEditor.selections = indentOps.map((indentOp) => {
        const active = new vscode.Position(indentOp.line, indentOp.newCursorChars);
        return new vscode.Selection(active, active);
      });

      this.latestIndentUnitsArr = indentOps.map((indentOp) => indentOp.newIndentUnits);
      this.latestTextEditor = textEditor;
      this.latestSelections = textEditor.selections;

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

  public onDidInterruptTextEditor(): void {
    const interruptedBySelfCursorMove =
      this.latestTextEditor === vscode.window.activeTextEditor &&
      this.latestSelections.every((latestSelection, i) => {
        const activeSelection = vscode.window.activeTextEditor?.selections[i];
        return activeSelection && latestSelection.isEqual(activeSelection);
      });
    if (!interruptedBySelfCursorMove) {
      this.latestIndentUnitsArr = [];
    }
  }
}
