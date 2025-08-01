import * as vscode from "vscode";
import { TextEditor, TextEditorRevealType } from "vscode";
import { EmacsCommand, ITextEditorInterruptionHandler } from ".";

enum RecenterPosition {
  Middle,
  Top,
  Bottom,
}

export class RecenterTopBottom extends EmacsCommand implements ITextEditorInterruptionHandler {
  public readonly id = "recenterTopBottom";

  private recenterPosition: RecenterPosition = RecenterPosition.Middle;

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void {
    const activeRange = new vscode.Range(textEditor.selection.active, textEditor.selection.active);

    switch (this.recenterPosition) {
      case RecenterPosition.Middle: {
        textEditor.revealRange(activeRange, TextEditorRevealType.InCenter);
        this.recenterPosition = RecenterPosition.Top;
        break;
      }
      case RecenterPosition.Top: {
        textEditor.revealRange(activeRange, TextEditorRevealType.AtTop);
        this.recenterPosition = RecenterPosition.Bottom;
        break;
      }
      case RecenterPosition.Bottom: {
        // TextEditor.revealRange does not support to set the cursor at the bottom of window.
        // Therefore, the number of lines to scroll is calculated here.
        const visibleRanges = textEditor.visibleRanges;
        if (visibleRanges.length === 0) {
          return;
        }
        let visibleLineCount = 0;
        for (const visibleRange of visibleRanges) {
          visibleLineCount += visibleRange.end.line - visibleRange.start.line + 1;
        }

        const currentLine = textEditor.selection.active.line;

        const nextVisibleTop = Math.max(currentLine - visibleLineCount, 0);

        // Scroll so that `nextVisibleTop` is the top of window
        const p = new vscode.Position(nextVisibleTop, 0);
        const r = new vscode.Range(p, p);
        textEditor.revealRange(r);

        this.recenterPosition = RecenterPosition.Middle;
        break;
      }
    }
  }

  public onDidInterruptTextEditor(): void {
    this.recenterPosition = RecenterPosition.Middle;
  }
}
