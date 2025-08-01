import * as vscode from "vscode";
import type { TextEditor } from "vscode";
import { EmacsCommand } from ".";

abstract class CommandInOtherWindow extends EmacsCommand {
  abstract runInOtherWindow(textEditor: vscode.TextEditor): void;

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void {
    const currentViewColumn = textEditor.viewColumn;
    if (currentViewColumn == null) {
      return;
    }

    const sortedVisibleTextEditors = vscode.window.visibleTextEditors
      .filter((editor) => editor.viewColumn !== null)
      .sort((a, b) => a.viewColumn! - b.viewColumn!);

    if (sortedVisibleTextEditors.length <= 1) {
      return;
    }
    const nextVisibleTextEditor =
      currentViewColumn === sortedVisibleTextEditors[sortedVisibleTextEditors.length - 1]!.viewColumn
        ? sortedVisibleTextEditors[0]
        : sortedVisibleTextEditors[
            sortedVisibleTextEditors.findIndex((editor) => editor.viewColumn === currentViewColumn) + 1
          ];
    if (nextVisibleTextEditor == null) {
      return;
    }

    this.runInOtherWindow(nextVisibleTextEditor);
  }
}

export class ScrollOtherWindow extends CommandInOtherWindow {
  public readonly id = "scrollOtherWindow";

  public runInOtherWindow(textEditor: vscode.TextEditor): void {
    const visibleRangeEndLine =
      textEditor.visibleRanges[textEditor.visibleRanges.length - 1]?.end.line ?? textEditor.document.lineCount - 1;
    const nextVisibleRangeStartLine = Math.min(visibleRangeEndLine + 1, textEditor.document.lineCount - 1);
    const nextVisibleRange = new vscode.Range(
      new vscode.Position(nextVisibleRangeStartLine, 0),
      new vscode.Position(nextVisibleRangeStartLine, 0), // We will call `revealRange()` with `AtTop` option, so the end position doesn't matter.
    );

    textEditor.revealRange(nextVisibleRange, vscode.TextEditorRevealType.AtTop);

    // Move the primary cursor into the visible range
    textEditor.selections = textEditor.selections.map((selection, i) => {
      if (i === 0) {
        return new vscode.Selection(selection.anchor, nextVisibleRange.start);
      } else {
        return selection;
      }
    });
  }
}

export class ScrollOtherWindowDown extends CommandInOtherWindow {
  public readonly id = "scrollOtherWindowDown";

  public runInOtherWindow(textEditor: vscode.TextEditor): void {
    const visibleLineStartLine = textEditor.visibleRanges[0]?.start.line ?? 0;

    // Calculate the number of lines to scroll.
    // This may be incorrect when some parts of the document are folded,
    // but it is the best we can do now.
    let pageLineCount = 0;
    textEditor.visibleRanges.forEach((range) => {
      pageLineCount += range.end.line - range.start.line + 1;
    });

    const marginLineCount = 3;
    pageLineCount -= marginLineCount * 2; // Reserve some lines for margin

    const nextVisibleRangeStartLine = Math.max(visibleLineStartLine - pageLineCount + 1, 0);
    const nextVisibleLineEndLine = Math.min(
      nextVisibleRangeStartLine + pageLineCount,
      textEditor.document.lineCount - 1,
    );
    const nextVisibleRange = new vscode.Range(
      new vscode.Position(nextVisibleRangeStartLine, 0),
      new vscode.Position(nextVisibleLineEndLine, 0),
    );

    textEditor.revealRange(nextVisibleRange);

    // Move the primary cursor into the visible range
    textEditor.selections = textEditor.selections.map((selection, i) => {
      if (i === 0) {
        return new vscode.Selection(selection.anchor, new vscode.Position(nextVisibleLineEndLine, 0));
      } else {
        return selection;
      }
    });
  }
}
