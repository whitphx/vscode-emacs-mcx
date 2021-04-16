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
    if (prefixArgument === undefined || prefixArgument === 1) {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorRightSelect" : "cursorRight");
    } else if (prefixArgument > 0) {
      const doc = textEditor.document;
      const newSelections = textEditor.selections.map((selection) => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset + prefixArgument);
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
    if (prefixArgument === undefined || prefixArgument === 1) {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorLeftSelect" : "cursorLeft");
    } else if (prefixArgument > 0) {
      const doc = textEditor.document;
      const newSelections = textEditor.selections.map((selection) => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset - prefixArgument);
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
    const value = prefixArgument === undefined ? 1 : prefixArgument;

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "down",
      by: "wrappedLine",
      value,
      select: isInMarkMode,
    });
  }
}

export class PreviousLine extends EmacsCommand {
  public readonly id = "previousLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const value = prefixArgument === undefined ? 1 : prefixArgument;

    return vscode.commands.executeCommand<void>("cursorMove", {
      to: "up",
      by: "wrappedLine",
      value,
      select: isInMarkMode,
    });
  }
}

export class MoveBeginningOfLine extends EmacsCommand {
  public readonly id = "moveBeginningOfLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
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
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorWordRightSelect" : "cursorWordRight")
    );
  }
}

export class BackwardWord extends EmacsCommand {
  public readonly id = "backwardWord";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
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
    const newSelections = textEditor.selections.map((selection) => {
      const activeLine = doc.lineAt(selection.active.line);
      const charIdxToMove = activeLine.firstNonWhitespaceCharacterIndex;
      const newActive = new vscode.Position(activeLine.lineNumber, charIdxToMove);
      return new vscode.Selection(isInMarkMode ? selection.anchor : newActive, newActive);
    });
    textEditor.selections = newSelections;
    revealPrimaryActive(textEditor);
  }
}

export class BeginningOfBuffer extends EmacsCommand {
  public readonly id = "beginningOfBuffer";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.pushMark(textEditor.selections.map((selection) => selection.anchor));
    MessageManager.showMessage("Mark set");
    return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorTopSelect" : "cursorTop");
  }
}

export class EndOfBuffer extends EmacsCommand {
  public readonly id = "endOfBuffer";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    this.emacsController.pushMark(textEditor.selections.map((selection) => selection.anchor));
    MessageManager.showMessage("Mark set");
    return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorBottomSelect" : "cursorBottom");
  }
}

export class ScrollUpCommand extends EmacsCommand {
  public readonly id = "scrollUpCommand";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;

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
    const newSelections = textEditor.selections.map((selection) => {
      let active = selection.active;
      for (let i = 0; i < repeat; ++i) {
        active = travelForwardParagraph(doc, active);
      }
      return new vscode.Selection(isInMarkMode ? selection.anchor : active, active);
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
    const newSelections = textEditor.selections.map((selection) => {
      let active = selection.active;
      for (let i = 0; i < repeat; ++i) {
        active = travelBackwardParagraph(doc, active);
      }
      return new vscode.Selection(isInMarkMode ? selection.anchor : active, active);
    });
    textEditor.selections = newSelections;
    revealPrimaryActive(textEditor);
  }
}
