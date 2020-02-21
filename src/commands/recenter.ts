import * as vscode from "vscode";
import { TextEditor, TextEditorRevealType } from "vscode";
import { EmacsCommand, IEmacsCommandInterrupted } from ".";

enum RecenterPosition {
  Middle,
  Top,
  Bottom
}

export class RecenterTopBottom extends EmacsCommand implements IEmacsCommandInterrupted {
  public readonly id = "recenterTopBottom";

  private recenterPosition: RecenterPosition = RecenterPosition.Middle;

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    switch (this.recenterPosition) {
      case RecenterPosition.Middle: {
        textEditor.revealRange(textEditor.selection, TextEditorRevealType.InCenter);
        this.recenterPosition = RecenterPosition.Top;
        break;
      }
      case RecenterPosition.Top: {
        textEditor.revealRange(textEditor.selection, TextEditorRevealType.AtTop);
        this.recenterPosition = RecenterPosition.Bottom;
        break;
      }
      case RecenterPosition.Bottom: {
        // TextEditor.revealRange does not supprt to set the cursor at the bottom of window.
        // Therefore, the number of lines to scroll is calculated here.
        const current = textEditor.selection.active.line;
        const visibleTop = textEditor.visibleRanges[0].start.line;
        const visibleBottom = textEditor.visibleRanges[0].end.line;
        const visibleHeight = visibleBottom - visibleTop;

        const nextVisibleTop = Math.max(current - visibleHeight, 1);

        // Scroll so that `nextVisibleTop` is the top of window
        const p = new vscode.Position(nextVisibleTop, 0);
        const r = new vscode.Range(p, p);
        textEditor.revealRange(r);

        this.recenterPosition = RecenterPosition.Middle;
        break;
      }
    }
  }

  public onDidInterruptTextEditor() {
    this.recenterPosition = RecenterPosition.Middle;
  }
}
