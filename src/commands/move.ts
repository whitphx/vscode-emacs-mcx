import * as vscode from "vscode";
import { TextEditor, TextEditorRevealType } from "vscode";
import { createParallel, EmacsCommand } from ".";
import { Configuration } from "../configuration/configuration";

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
  "backwardParagraph",
  "forwardParagraph"
];

export class ForwardChar extends EmacsCommand {
  public readonly id = "forwardChar";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    if (prefixArgument === undefined || prefixArgument === 1) {
      return vscode.commands.executeCommand<void>(isInMarkMode ? "cursorRightSelect" : "cursorRight");
    } else if (prefixArgument > 0) {
      const doc = textEditor.document;
      const newSelections = textEditor.selections.map(selection => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset + prefixArgument);
        const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
        return new vscode.Selection(newAnchorPos, newActivePos);
      });
      textEditor.selections = newSelections;
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
      const newSelections = textEditor.selections.map(selection => {
        const offset = doc.offsetAt(selection.active);
        const newActivePos = doc.positionAt(offset - prefixArgument);
        const newAnchorPos = isInMarkMode ? selection.anchor : newActivePos;
        return new vscode.Selection(newAnchorPos, newActivePos);
      });
      textEditor.selections = newSelections;
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
      select: isInMarkMode
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
      select: isInMarkMode
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
          select: isInMarkMode
        });
      } else {
        // VSCode behavior: Move to the first non-empty charactor (indentation).
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
          isInMarkMode
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
          isInMarkMode
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

export class BeginningOfBuffer extends EmacsCommand {
  public readonly id = "beginningOfBuffer";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorTopSelect" : "cursorTop")
    );
  }
}

export class EndOfBuffer extends EmacsCommand {
  public readonly id = "endOfBuffer";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return createParallel(repeat, () =>
      vscode.commands.executeCommand<void>(isInMarkMode ? "cursorBottomSelect" : "cursorBottom")
    );
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
            by: "page"
          })
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "viewPortTop",
              select: isInMarkMode
            })
          )
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "wrappedLineStart",
              select: isInMarkMode
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
        select: isInMarkMode
      })
      .then(() => textEditor.revealRange(textEditor.selection, TextEditorRevealType.InCenterIfOutsideViewport));
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
            by: "page"
          })
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "viewPortBottom",
              select: isInMarkMode
            })
          )
          .then(() =>
            vscode.commands.executeCommand<void>("cursorMove", {
              to: "wrappedLineStart",
              select: isInMarkMode
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
        select: isInMarkMode
      })
      .then(() => textEditor.revealRange(textEditor.selection, TextEditorRevealType.InCenterIfOutsideViewport));
  }
}

// Find the next empty line. Direction should be -1 for back or +1 for forward.
function nextEmptyLine(textEditor: TextEditor, direction: number) {
  // Find the limit (either first or last line).
  let bound = 0;
  if (direction > 0) {
    bound = textEditor.document.lineCount - 1;
  }

  let line = textEditor.selection.active.line;
  for (;;) {
    // If we've reached the boundary, we can't go further.
    if (line === bound) {
      break;
    }
    line += direction;
    // If we've found an empty line, we are done.
    if (textEditor.document.lineAt(line).isEmptyOrWhitespace) {
      break;
    }
  }
  return textEditor.document.lineAt(line);
}

export class BackwardParagraph extends EmacsCommand {
  public readonly id = "backwardParagraph";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    let repeat = prefixArgument === undefined ? 1 : prefixArgument;
    for (; repeat > 0; repeat--) {
      const line = nextEmptyLine(textEditor, -1);
      const pos = new vscode.Position(line.lineNumber, 0);
      // If we are in mark mode, we want to use the current selection as the
      // anchor, otherwise, just the new position.
      const anchor = isInMarkMode ? textEditor.selection.anchor : pos;
      const sel = new vscode.Selection(anchor, pos);
      textEditor.selection = sel;
      textEditor.revealRange(new vscode.Range(pos, pos));
    }
  }
}

export class ForwardParagraph extends EmacsCommand {
  public readonly id = "forwardParagraph";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    let repeat = prefixArgument === undefined ? 1 : prefixArgument;
    for (; repeat > 0; repeat--) {
      const line = nextEmptyLine(textEditor, 1);
      const pos = new vscode.Position(line.lineNumber, 0);
      // If we are in mark mode, we want to use the current selection as the
      // anchor, otherwise, just the new position.
      const anchor = isInMarkMode ? textEditor.selection.anchor : pos;
      const sel = new vscode.Selection(anchor, pos);
      textEditor.selection = sel;
      textEditor.revealRange(new vscode.Range(pos, pos));
    }
  }
}
