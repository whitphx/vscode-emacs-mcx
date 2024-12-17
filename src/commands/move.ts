import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { makeParallel, EmacsCommand } from ".";
import { Configuration } from "../configuration/configuration";
import {
  travelForward as travelForwardParagraph,
  travelBackward as travelBackwardParagraph,
} from "./helpers/paragraph";
import { MessageManager } from "../message";
import { revealPrimaryActive } from "./helpers/reveal";
import { IEmacsController } from "src/emulator";

// TODO: be unnecessary
export const moveCommandIds = [
  "forwardChar",
  "backwardChar",
  "nextLine",
  "previousLine",
  "moveBeginningOfLine",
  "moveEndOfLine",
  "forwardWord",
  "backwardWord",
  "beginningOfBuffer",
  "endOfBuffer",
  "scrollUpCommand",
  "scrollDownCommand",
  "forwardParagraph",
  "backwardParagraph",
  "backToIndentation",
];

export class ForwardChar extends EmacsCommand {
  public readonly id = "forwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    const charDelta = prefixArgument == undefined ? 1 : prefixArgument;
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActive) => curActive.translate(0, charDelta));
      return;
    }

    if (charDelta === 1) {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorRightSelect" : "cursorRight");
    } else if (charDelta > 0) {
      const doc = textEditor.document;
      const newSelections = textEditor.selections.map((selection) => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset + charDelta);
        const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
        return new vscode.Selection(newAnchorPos, newActivePos);
      });
      textEditor.selections = newSelections;
      revealPrimaryActive(textEditor);
    }
  }
}

export class BackwardChar extends EmacsCommand {
  public readonly id = "backwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    const charDelta = prefixArgument == undefined ? 1 : prefixArgument;
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(
        (curActive) => new vscode.Position(curActive.line, Math.max(curActive.character - charDelta, 0)),
      );
      return;
    }

    if (charDelta === 1) {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorLeftSelect" : "cursorLeft");
    } else if (charDelta > 0) {
      const doc = textEditor.document;
      const newSelections = textEditor.selections.map((selection) => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset - charDelta);
        const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
        return new vscode.Selection(newAnchorPos, newActivePos);
      });
      textEditor.selections = newSelections;
      revealPrimaryActive(textEditor);
    }
  }
}

export class NextLine extends EmacsCommand {
  public readonly id = "nextLine";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    const lineDelta = prefixArgument == undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      const maxLine = textEditor.document.lineCount - 1;
      this.emacsController.moveRectActives(
        (curActive) => new vscode.Position(Math.min(curActive.line + lineDelta, maxLine), curActive.character),
      );
      return;
    }

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "down",
      by: Configuration.instance.lineMoveVisual ? "wrappedLine" : "line",
      value: lineDelta,
      select: isInMarkMode,
    });
  }
}

export class PreviousLine extends EmacsCommand {
  public readonly id = "previousLine";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    const lineDelta = prefixArgument == undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(
        (curActive) => new vscode.Position(Math.max(curActive.line - lineDelta, 0), curActive.character),
      );
      return;
    }

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "up",
      by: Configuration.instance.lineMoveVisual ? "wrappedLine" : "line",
      value: lineDelta,
      select: isInMarkMode,
    });
  }
}

export class MoveBeginningOfLine extends EmacsCommand {
  public readonly id = "moveBeginningOfLine";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActive) => textEditor.document.lineAt(curActive.line).range.start);
    }

    let moveHomeCommand: string;
    if (Configuration.instance.strictEmacsMove) {
      // Emacs behavior: Move to the beginning of the line.
      moveHomeCommand = isInMarkMode ? "cursorLineStartSelect" : "cursorLineStart";
    } else {
      // VSCode behavior: Move to the first non-empty character (indentation).
      moveHomeCommand = isInMarkMode ? "cursorHomeSelect" : "cursorHome";
    }

    const moveHomeCommandFunc = () => vscode.commands.executeCommand<void>(moveHomeCommand);

    if (prefixArgument === undefined || prefixArgument === 1) {
      return moveHomeCommandFunc();
    } else if (prefixArgument > 1) {
      return vscode.commands
        .executeCommand<void>("cursorMove", {
          to: "down",
          by: "line",
          value: prefixArgument - 1,
          isInMarkMode,
        })
        .then(moveHomeCommandFunc);
    }
  }
}

export class MoveEndOfLine extends EmacsCommand {
  public readonly id = "moveEndOfLine";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActive) => textEditor.document.lineAt(curActive.line).range.end);
      return;
    }

    let moveEndCommand: string;
    if (Configuration.instance.strictEmacsMove) {
      // Emacs behavior: Move to the end of the line.
      moveEndCommand = isInMarkMode ? "cursorLineEndSelect" : "cursorLineEnd";
    } else {
      // VSCode behavior: Move to the end of the wrapped line.
      moveEndCommand = isInMarkMode ? "cursorEndSelect" : "cursorEnd";
    }
    const moveEndCommandFunc = () => vscode.commands.executeCommand<void>(moveEndCommand);

    if (prefixArgument === undefined || prefixArgument === 1) {
      return moveEndCommandFunc();
    } else if (prefixArgument > 1) {
      return vscode.commands
        .executeCommand<void>("cursorMove", {
          to: "down",
          by: "line",
          value: prefixArgument - 1,
          isInMarkMode,
        })
        .then(moveEndCommandFunc);
    }
  }
}

export class ForwardWord extends EmacsCommand {
  public readonly id = "forwardWord";

  public run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): void | Thenable<unknown> {
    if (this.emacsController.inRectMarkMode) {
      // TODO: Not supported
      return;
    }

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorWordRightSelect" : "cursorWordRight"),
    );
  }
}

export class BackwardWord extends EmacsCommand {
  public readonly id = "backwardWord";

  public run(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): void | Thenable<unknown> {
    if (this.emacsController.inRectMarkMode) {
      // TODO: Not supported
      return;
    }

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorWordLeftSelect" : "cursorWordLeft"),
    );
  }
}

export class BackToIndentation extends EmacsCommand {
  public readonly id = "backToIndentation";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    const doc = textEditor.document;

    const moveActiveFunc = (active: vscode.Position): vscode.Position => {
      const activeLine = doc.lineAt(active.line);
      const charIdxToMove = activeLine.firstNonWhitespaceCharacterIndex;
      const newActive = new vscode.Position(activeLine.lineNumber, charIdxToMove);
      return newActive;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(moveActiveFunc);
      return;
    }

    const newSelections = textEditor.selections.map((selection) => {
      const newActive = moveActiveFunc(selection.active);
      return new vscode.Selection(isInMarkMode ? selection.anchor : newActive, newActive);
    });
    textEditor.selections = newSelections;
    revealPrimaryActive(textEditor);
  }
}

export class BeginningOfBuffer extends EmacsCommand {
  public readonly id = "beginningOfBuffer";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      const beginning = textEditor.document.positionAt(0);
      this.emacsController.moveRectActives(() => beginning);
      return;
    }

    if (!isInMarkMode) {
      this.emacsController.pushMark(textEditor.selections.map((selection) => selection.anchor));
      MessageManager.showMessage("Mark set");
    }
    return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorTopSelect" : "cursorTop");
  }
}

export class EndOfBuffer extends EmacsCommand {
  public readonly id = "endOfBuffer";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      const end = textEditor.document.lineAt(textEditor.document.lineCount - 1).range.end;
      this.emacsController.moveRectActives(() => end);
      return;
    }

    if (!isInMarkMode) {
      this.emacsController.pushMark(textEditor.selections.map((selection) => selection.anchor));
      MessageManager.showMessage("Mark set");
    }
    return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorBottomSelect" : "cursorBottom");
  }
}

export function movePrimaryCursorIntoVisibleRange(
  textEditor: TextEditor,
  isInMarkMode: boolean,
  emacsController: IEmacsController,
) {
  const visibleRanges = textEditor.visibleRanges;
  // `visibleRanges` can have multiple ranges when there is a folded region.
  // TODO: Now we don't have a good way to test such a case.
  const firstVisibleRange = visibleRanges[0];
  const lastVisibleRange = visibleRanges[visibleRanges.length - 1];
  if (firstVisibleRange == null || lastVisibleRange == null) {
    return;
  }

  const primaryAnchor = textEditor.selection.anchor;
  const primaryActive = textEditor.selection.active;
  let newPrimaryActive: vscode.Position;
  if (primaryActive.isBefore(firstVisibleRange.start)) {
    newPrimaryActive = firstVisibleRange.start.with(undefined, 0);
  } else if (
    // This method is called in the `onDidChangeTextEditorVisibleRanges` callback,
    // and it is called when the user edits the document maybe because the edit moves the cursor.
    // When executing the `deleteLeft` command for example, the document is shortened by 1 character
    // and the cursor is moved to 1 character left, which is correct. However, in this case,
    // the `onDidChangeTextEditorVisibleRanges` is called before `textEditor.selection` is updated,
    // so we can't compare `visibleRange` with `editor.selection.active` directly in this method,
    // which causes the issue like https://github.com/whitphx/vscode-emacs-mcx/issues/2113.
    // * To solve the issue https://github.com/whitphx/vscode-emacs-mcx/issues/2113, we compare the lines instead of the positions.
    // * Also, we compare the primaryActive.line with visibleRange.end.line + 1
    //   because, for example, when the cursor is at [lastLine, 0] and the `deleteLeft` command is executed,
    //   `visibleRange.end.line` becomes `lastLine - 1` but the cursor position is still [lastLine, 0] when this method is called form the callback due to the problem stated above,
    //   in which case the cursor is considered out of the visible range, which is incorrect.
    primaryActive.line >
    lastVisibleRange.end.line + 1
  ) {
    newPrimaryActive = lastVisibleRange.end.with(undefined, 0);
  } else {
    return;
  }

  if (emacsController.inRectMarkMode) {
    emacsController.moveRectActives((curActive, i) => {
      if (i === 0) {
        return newPrimaryActive;
      } else {
        return curActive;
      }
    });
    return;
  }

  const newPrimarySelection = new vscode.Selection(isInMarkMode ? primaryAnchor : newPrimaryActive, newPrimaryActive);
  const newSelections = [newPrimarySelection, ...textEditor.selections.slice(1)];
  textEditor.selections = newSelections;
}

export class ScrollUpCommand extends EmacsCommand {
  public readonly id = "scrollUpCommand";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (prefixArgument != null) {
      return vscode.commands
        .executeCommand<void>("editorScroll", {
          to: "down",
          by: Configuration.instance.lineMoveVisual ? "wrappedLine" : "line",
          value: prefixArgument,
        })
        .then(() => movePrimaryCursorIntoVisibleRange(textEditor, isInMarkMode, this.emacsController));
    }

    if (Configuration.instance.strictEmacsMove) {
      return vscode.commands.executeCommand<void>("editorScroll", {
        to: "down",
        by: "page",
      });
    } else {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorPageDownSelect" : "cursorPageDown");
    }
  }
}

export class ScrollDownCommand extends EmacsCommand {
  public readonly id = "scrollDownCommand";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void | Thenable<void> {
    if (prefixArgument != null) {
      return vscode.commands
        .executeCommand<void>("editorScroll", {
          to: "up",
          by: Configuration.instance.lineMoveVisual ? "wrappedLine" : "line",
          value: prefixArgument,
        })
        .then(() => movePrimaryCursorIntoVisibleRange(textEditor, isInMarkMode, this.emacsController));
    }

    if (Configuration.instance.strictEmacsMove) {
      return vscode.commands.executeCommand<void>("editorScroll", {
        to: "up",
        by: "page",
      });
    } else {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorPageUpSelect" : "cursorPageUp");
    }
  }
}

export class ForwardParagraph extends EmacsCommand {
  public readonly id = "forwardParagraph";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    const doc = textEditor.document;

    const repeatedTravelForwardParagraph = (pos: vscode.Position): vscode.Position => {
      for (let i = 0; i < repeat; ++i) {
        pos = travelForwardParagraph(doc, pos);
      }
      return pos;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(repeatedTravelForwardParagraph);
      return;
    }

    const newSelections = textEditor.selections.map((selection) => {
      const newActive = repeatedTravelForwardParagraph(selection.active);
      return new vscode.Selection(isInMarkMode ? selection.anchor : newActive, newActive);
    });
    textEditor.selections = newSelections;
    revealPrimaryActive(textEditor);
  }
}

export class BackwardParagraph extends EmacsCommand {
  public readonly id = "backwardParagraph";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    const doc = textEditor.document;

    const repeatedTravelBackwardParagraph = (pos: vscode.Position): vscode.Position => {
      for (let i = 0; i < repeat; ++i) {
        pos = travelBackwardParagraph(doc, pos);
      }
      return pos;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(repeatedTravelBackwardParagraph);
      return;
    }

    const newSelections = textEditor.selections.map((selection) => {
      const newActive = repeatedTravelBackwardParagraph(selection.active);
      return new vscode.Selection(isInMarkMode ? selection.anchor : newActive, newActive);
    });
    textEditor.selections = newSelections;
    revealPrimaryActive(textEditor);
  }
}
