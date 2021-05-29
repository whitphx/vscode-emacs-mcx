import * as vscode from "vscode";
import { TextEditor } from "vscode";
import { createParallel, EmacsCommand } from ".";
import { Configuration } from "../configuration/configuration";
import {
  travelForward as travelForwardParagraph,
  travelBackward as travelBackwardParagraph,
} from "./helpers/paragraph";
import { MessageManager } from "../message";
import { revealPrimaryActive } from "./helpers/reveal";

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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const charDelta = prefixArgument == undefined ? 1 : prefixArgument;
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) => curActives.map((a) => a.translate(0, charDelta)));
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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const charDelta = prefixArgument == undefined ? 1 : prefixArgument;
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => new vscode.Position(a.line, Math.max(a.character - charDelta, 0)))
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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const lineDelta = prefixArgument == undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      const maxLine = textEditor.document.lineCount - 1;
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => new vscode.Position(Math.min(a.line + lineDelta, maxLine), a.character))
      );
      return;
    }

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "down",
      by: "wrappedLine",
      value: lineDelta,
      select: isInMarkMode,
    });
  }
}

export class PreviousLine extends EmacsCommand {
  public readonly id = "previousLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const lineDelta = prefixArgument == undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => new vscode.Position(Math.max(a.line - lineDelta, 0), a.character))
      );
      return;
    }

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "up",
      by: "wrappedLine",
      value: lineDelta,
      select: isInMarkMode,
    });
  }
}

export class MoveBeginningOfLine extends EmacsCommand {
  public readonly id = "moveBeginningOfLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => textEditor.document.lineAt(a.line).range.start)
      );
    }

    const moveHomeCommandFunc = () => {
      if (Configuration.instance.strictEmacsMove) {
        // Emacs behavior: Move to the beginning of the line.
        return vscode.commands.executeCommand<void>("cursorMove", {
          to: "wrappedLineStart",
          select: isInMarkMode,
        });
      } else {
        // VSCode behavior: Move to the first non-empty character (indentation).
        return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorHomeSelect" : "cursorHome");
      }
    };

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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => textEditor.document.lineAt(a.line).range.end)
      );
      return;
    }

    const moveEndCommandFunc = () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorEndSelect" : "cursorEnd");

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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    if (this.emacsController.inRectMarkMode) {
      // TODO: Not supported
      return;
    }

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorWordRightSelect" : "cursorWordRight")
    );
  }
}

export class BackwardWord extends EmacsCommand {
  public readonly id = "backwardWord";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    if (this.emacsController.inRectMarkMode) {
      // TODO: Not supported
      return;
    }

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorWordLeftSelect" : "cursorWordLeft")
    );
  }
}

export class BackToIndentation extends EmacsCommand {
  public readonly id = "backToIndentation";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const doc = textEditor.document;

    const moveActiveFunc = (active: vscode.Position): vscode.Position => {
      const activeLine = doc.lineAt(active.line);
      const charIdxToMove = activeLine.firstNonWhitespaceCharacterIndex;
      const newActive = new vscode.Position(activeLine.lineNumber, charIdxToMove);
      return newActive;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) => curActives.map(moveActiveFunc));
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

  public execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      const beginning = textEditor.document.positionAt(0);
      this.emacsController.moveRectActives((curActives) => curActives.map(() => beginning));
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

  public execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined
  ): void | Thenable<void> {
    if (this.emacsController.inRectMarkMode) {
      const end = textEditor.document.lineAt(textEditor.document.lineCount - 1).range.end;
      this.emacsController.moveRectActives((curActives) => curActives.map(() => end));
      return;
    }

    if (!isInMarkMode) {
      this.emacsController.pushMark(textEditor.selections.map((selection) => selection.anchor));
      MessageManager.showMessage("Mark set");
    }
    return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorBottomSelect" : "cursorBottom");
  }
}

export class ScrollUpCommand extends EmacsCommand {
  public readonly id = "scrollUpCommand";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      if (textEditor.visibleRanges.length === 0) {
        return;
      }
      const visibleRange = textEditor.visibleRanges[0];
      const pageSize = Math.max(1, visibleRange.end.line - visibleRange.start.line - 2); // Ad-hoc
      const lineDelta = pageSize * repeat;

      const maxLine = textEditor.document.lineCount - 1;
      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => new vscode.Position(Math.min(a.line + lineDelta, maxLine), a.character))
      );
      return;
    }

    if (repeat === 1) {
      if (Configuration.instance.strictEmacsMove) {
        return vscode.commands
          .executeCommand<void>("editorScroll", {
            to: "down",
            by: "page",
          })
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "viewPortTop",
              select: isInMarkMode,
            })
          )
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "wrappedLineStart",
              select: isInMarkMode,
            })
          );
      } else {
        return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorPageDownSelect" : "cursorPageDown");
      }
    }

    return vscode.commands
      .executeCommand<void>("cursorMove", {
        to: "down",
        by: "wrappedLine",
        value: repeat,
        select: isInMarkMode,
      })
      .then(() => revealPrimaryActive(textEditor));
  }
}

export class ScrollDownCommand extends EmacsCommand {
  public readonly id = "scrollDownCommand";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;

    if (this.emacsController.inRectMarkMode) {
      if (textEditor.visibleRanges.length === 0) {
        return;
      }
      const visibleRange = textEditor.visibleRanges[0];
      const pageSize = Math.max(1, visibleRange.end.line - visibleRange.start.line - 2); // Ad-hoc
      const lineDelta = pageSize * repeat;

      this.emacsController.moveRectActives((curActives) =>
        curActives.map((a) => new vscode.Position(Math.max(a.line - lineDelta, 0), a.character))
      );
      return;
    }

    if (repeat === 1) {
      if (Configuration.instance.strictEmacsMove) {
        return vscode.commands
          .executeCommand<void>("editorScroll", {
            to: "up",
            by: "page",
          })
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "viewPortBottom",
              select: isInMarkMode,
            })
          )
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "wrappedLineStart",
              select: isInMarkMode,
            })
          );
      } else {
        return vscode.commands.executeCommand<string>(isInMarkMode ? "cursorPageUpSelect" : "cursorPageUp");
      }
    }

    return vscode.commands
      .executeCommand<void>("cursorMove", {
        to: "up",
        by: "wrappedLine",
        value: repeat,
        select: isInMarkMode,
      })
      .then(() => revealPrimaryActive(textEditor));
  }
}

export class ForwardParagraph extends EmacsCommand {
  public readonly id = "forwardParagraph";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    const doc = textEditor.document;

    const repeatedTravelForwardParagraph = (pos: vscode.Position): vscode.Position => {
      for (let i = 0; i < repeat; ++i) {
        pos = travelForwardParagraph(doc, pos);
      }
      return pos;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) => curActives.map(repeatedTravelForwardParagraph));
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

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    const doc = textEditor.document;

    const repeatedTravelBackwardParagraph = (pos: vscode.Position): vscode.Position => {
      for (let i = 0; i < repeat; ++i) {
        pos = travelBackwardParagraph(doc, pos);
      }
      return pos;
    };

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives((curActives) => curActives.map(repeatedTravelBackwardParagraph));
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
