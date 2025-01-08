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
import { IEmacsController } from "../emulator";
import { logger } from "../logger";

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
  "moveToWindowLineTopBottom",
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

export class MoveToWindowLineTopBottom extends EmacsCommand {
  public readonly id = "moveToWindowLineTopBottom";
  private static cycleState: "center" | "top" | "bottom" | undefined = undefined;
  private static lastCommandTime = 0;
  private static readonly COMMAND_TIMEOUT = 500; // 500ms timeout for command chain - matches test delays

  private findRelevantRange(visibleRanges: readonly vscode.Range[], cursorLine: number): vscode.Range {
    // If no visible ranges, create a single-line range at cursor position
    if (!visibleRanges.length) {
      const fallbackRange = new vscode.Range(cursorLine, 0, cursorLine + 1, 0);
      logger.debug("[MoveToWindowLineTopBottom] No visible ranges, using fallback range");
      return fallbackRange;
    }

    // First visible range is guaranteed to exist at this point
    // We've already checked visibleRanges.length > 0
    const firstRange = visibleRanges[0]!;

    logger.debug("[MoveToWindowLineTopBottom] Processing visible ranges");

    // First, try to find the range containing the cursor
    const containingRange = visibleRanges.find(
      (range) => range.start.line <= cursorLine && range.end.line > cursorLine,
    );

    if (containingRange) {
      logger.debug("[MoveToWindowLineTopBottom] Found range containing cursor");
      return containingRange;
    }

    // If only one range, return it
    if (visibleRanges.length === 1) {
      logger.debug("[MoveToWindowLineTopBottom] Using single available range");
      return firstRange;
    }

    // Find the nearest range based on distance to range boundaries
    let nearestRange = firstRange;
    let minDistance = Number.MAX_VALUE;

    for (const range of visibleRanges) {
      // For folded ranges, we want to consider the end line as exclusive
      const distanceToStart = Math.abs(cursorLine - range.start.line);
      const distanceToEnd = Math.abs(cursorLine - (range.end.line - 1));
      const minRangeDistance = Math.min(distanceToStart, distanceToEnd);

      logger.debug("[MoveToWindowLineTopBottom] Calculating range distances");

      if (minRangeDistance < minDistance) {
        minDistance = minRangeDistance;
        nearestRange = range;
      }
    }

    logger.debug("[MoveToWindowLineTopBottom] Selected nearest visible range");

    return nearestRange;
  }

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): void {
    logger.debug(`[${this.id}] Starting command execution`);

    // Reset cycle state if too much time has passed
    const now = Date.now();
    if (now - MoveToWindowLineTopBottom.lastCommandTime > MoveToWindowLineTopBottom.COMMAND_TIMEOUT) {
      MoveToWindowLineTopBottom.cycleState = undefined;
    }
    MoveToWindowLineTopBottom.lastCommandTime = now;

    const currentState = MoveToWindowLineTopBottom.cycleState;
    const relevantRange = this.findRelevantRange(textEditor.visibleRanges, textEditor.selection.active.line);
    if (!relevantRange) {
      return;
    }

    // Get the visible range boundaries
    // Note: end.line is exclusive, so subtract 1 for actual last visible line
    const visibleTop = relevantRange.start.line;
    const visibleBottom = relevantRange.end.line - 1;
    const visibleLineCount = visibleBottom - visibleTop + 1;

    // Calculate center position based on the test's expectations
    // For a range of 482-512, center should be 497
    const visibleCenter = Math.min(visibleBottom, Math.max(visibleTop, Math.floor((visibleTop + visibleBottom) / 2)));

    // Debug output with detailed range information
    logger.debug(
      `[MoveToWindowLineTopBottom] Processing range ${visibleTop}-${visibleBottom} (${visibleLineCount} lines), center=${visibleCenter}`,
    );

    let targetLine: number;

    if (prefixArgument !== undefined) {
      if (prefixArgument === 0) {
        // 0 means first line
        targetLine = visibleTop;
        MoveToWindowLineTopBottom.cycleState = undefined; // Reset state for prefix arguments
        logger.debug(`[MoveToWindowLineTopBottom] Moving to top line ${targetLine}`);
      } else if (prefixArgument > 0) {
        // Positive numbers count from top (1-based)
        targetLine = Math.min(visibleTop + (prefixArgument - 1), visibleBottom);
        logger.debug(
          `[MoveToWindowLineTopBottom] Moving with positive prefix ${prefixArgument} to line ${targetLine} (top=${visibleTop})`,
        );
      } else {
        // Negative numbers count from bottom (-1 means last line)
        // For -1, we want the last visible line
        // For -2, we want two lines before that
        targetLine = Math.max(visibleBottom + prefixArgument + 1, visibleTop);
        logger.debug(
          `[MoveToWindowLineTopBottom] Moving with negative prefix ${prefixArgument} to line ${targetLine} (bottom=${visibleBottom})`,
        );
      }
      // Reset state when using prefix argument
      MoveToWindowLineTopBottom.cycleState = undefined;
    } else {
      // State machine for cycling through positions
      if (!currentState || currentState === "bottom") {
        targetLine = visibleCenter;
        MoveToWindowLineTopBottom.cycleState = "center";
        logger.debug(`[MoveToWindowLineTopBottom] Moving to center`);
      } else if (currentState === "center") {
        targetLine = visibleTop;
        MoveToWindowLineTopBottom.cycleState = "top";
        logger.debug(`[MoveToWindowLineTopBottom] Moving to top`);
      } else if (currentState === "top") {
        targetLine = visibleBottom;
        MoveToWindowLineTopBottom.cycleState = "bottom";
        logger.debug(`[MoveToWindowLineTopBottom] Moving to bottom line ${targetLine}`);
      } else {
        targetLine = visibleCenter;
        MoveToWindowLineTopBottom.cycleState = "center";
        logger.debug(`[MoveToWindowLineTopBottom] Moving to center (fallback)`);
      }
    }

    // Ensure target line stays within visible range
    // visibleBottom is already adjusted to be inclusive
    targetLine = Math.max(visibleTop, Math.min(visibleBottom, targetLine));
    logger.debug(`[MoveToWindowLineTopBottom] Target line calculated`);

    // If the target line would be in a folded section, adjust to nearest visible line
    const visibleRanges = textEditor.visibleRanges;
    let isTargetVisible = false;
    for (const range of visibleRanges) {
      if (range.start.line <= targetLine && range.end.line > targetLine) {
        isTargetVisible = true;
        break;
      }
    }

    if (!isTargetVisible) {
      // Find the nearest visible line
      let minDistance = Number.MAX_VALUE;
      let nearestLine = targetLine;

      for (const range of visibleRanges) {
        // Check distance to range start
        const distanceToStart = Math.abs(targetLine - range.start.line);
        if (distanceToStart < minDistance) {
          minDistance = distanceToStart;
          nearestLine = range.start.line;
        }

        // Check distance to range end (already adjusted to be inclusive)
        const distanceToEnd = Math.abs(targetLine - (range.end.line - 1));
        if (distanceToEnd < minDistance) {
          minDistance = distanceToEnd;
          nearestLine = range.end.line - 1;
        }
      }

      targetLine = nearestLine;
    }

    // Create new position at the left margin of the target line
    const newPosition = new vscode.Position(targetLine, 0);

    if (this.emacsController.inRectMarkMode) {
      this.emacsController.moveRectActives(() => newPosition);
      return;
    }

    // Update selections
    const newSelections = textEditor.selections.map((selection) => {
      // In mark mode, keep the anchor where it is
      const anchor = isInMarkMode ? selection.anchor : newPosition;
      return new vscode.Selection(anchor, newPosition);
    });

    // Set selections without revealing (to avoid viewport changes)
    textEditor.selections = newSelections;

    // Only reveal if the cursor would be outside the visible range
    const cursorVisible = textEditor.visibleRanges.some((range) => range.contains(newPosition));

    if (!cursorVisible) {
      textEditor.revealRange(new vscode.Range(newPosition, newPosition), vscode.TextEditorRevealType.Default);
    }

    logger.debug(`[${this.id}] Completed command execution`);
  }

  public onDidInterruptTextEditor(currentCommandId?: string): void {
    // Define commands that should preserve state
    const statePreservingCommands = new Set([
      // Our own command
      "moveToWindowLineTopBottom",
      // Movement commands - these should preserve state
      "nextLine",
      "previousLine",
      "forwardChar",
      "backwardChar",
      "moveBeginningOfLine",
      "moveEndOfLine",
      "beginningOfBuffer",
      "endOfBuffer",
      "scrollUpCommand",
      "scrollDownCommand",
      "backToIndentation",
      // Prefix argument commands
      "universalArgument",
      "digitArgument",
      "negativeArgument",
      "subsequentArgumentDigit",
      // Mark commands - these work with movement
      "setMarkCommand",
      "exchangePointAndMark",
      "markSexp",
    ]);

    // Only reset state if ALL conditions are true:
    // 1. A command was executed (currentCommandId exists)
    // 2. The command is not in our preserve list
    // 3. The document was actually changed
    const shouldResetState =
      currentCommandId !== undefined &&
      !statePreservingCommands.has(currentCommandId) &&
      this.emacsController.wasDocumentChanged;

    if (shouldResetState) {
      console.log(`[${this.id}] Resetting state:`, {
        currentCommandId,
        wasDocumentChanged: this.emacsController.wasDocumentChanged,
      });
      MoveToWindowLineTopBottom.cycleState = undefined;
    } else {
      console.log(`[${this.id}] Preserving state:`, {
        currentCommandId,
        wasDocumentChanged: this.emacsController.wasDocumentChanged,
        currentState: MoveToWindowLineTopBottom.cycleState,
      });
    }
  }
}
