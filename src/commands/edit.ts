import * as vscode from "vscode";
import { Range, Selection, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { makeParallel } from "./helpers/parallel";
import { makeSelectionsEmpty } from "./helpers/selection";
import { revealPrimaryActive } from "./helpers/reveal";
import { delay } from "../utils";
import { Logger } from "../logger";
import { IEmacsController } from "../emulator";

const logger = Logger.get("EditCommands");

export class DeleteBackwardChar extends EmacsCommand {
  public readonly id = "deleteBackwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<unknown> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () => vscode.commands.executeCommand("deleteLeft"));
  }
}

export class DeleteForwardChar extends EmacsCommand {
  public readonly id = "deleteForwardChar";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    return makeParallel(repeat, () =>
      vscode.commands.executeCommand<void>("deleteRight"),
    ) as Thenable<unknown> as Thenable<void>;
  }
}

export class DeleteHorizontalSpace extends EmacsCommand {
  public readonly id = "deleteHorizontalSpace";

  public run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const onlyBefore = prefixArgument === undefined ? false : prefixArgument > 0;
    return textEditor
      .edit((editBuilder) => {
        textEditor.selections.forEach((selection) => {
          const line = selection.active.line;

          let from = selection.active.character;
          while (from > 0) {
            const char = textEditor.document.getText(new Range(line, from - 1, line, from));
            if (char !== " " && char !== "\t") {
              break;
            }
            from -= 1;
          }

          let to = selection.active.character;
          if (!onlyBefore) {
            const lineEnd = textEditor.document.lineAt(line).range.end.character;
            while (to < lineEnd) {
              const char = textEditor.document.getText(new Range(line, to, line, to + 1));
              if (char !== " " && char !== "\t") {
                break;
              }
              to += 1;
            }
          }

          editBuilder.delete(new Range(line, from, line, to));
        });
      })
      .then((success) => {
        if (!success) {
          logger.warn("deleteHorizontalSpace failed");
        }
      })
      .then(() => {
        makeSelectionsEmpty(textEditor);
      });
  }
}

export class NewLine extends EmacsCommand {
  public readonly id = "newLine";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    this.emacsController.exitMarkMode();

    textEditor.selections = textEditor.selections.map((selection) => new Selection(selection.active, selection.active));

    const repeat = prefixArgument === undefined ? 1 : prefixArgument;

    if (repeat <= 0) {
      return;
    }
    if (repeat === 1) {
      return vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    }

    // We don't use a combination of `createParallel` and `vscode.commands.executeCommand("default:type", { text: "\n" })`
    // here because it doesn't work well with undo/redo pushing multiple edits into the undo stack.
    // Instead, we use `textEditor.edit` to push a single edit into the undo stack.
    // To do so, we first call the `default:type` command twice to insert two new lines
    // and record the inserted texts.
    // Then undo these two edits and call `textEditor.edit` to insert the repeated texts at once.

    const initCursorsAtEndOfLine = textEditor.selections.map((selection) => {
      return selection.active.isEqual(textEditor.document.lineAt(selection.active.line).range.end);
    });

    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });
    await delay(33); // Wait for code completion to finish. The value is ad-hoc.
    await vscode.commands.executeCommand<void>("default:type", { text: "\n" });

    // The first inserted lines can be affected by the second ones.
    // We need to capture its final content after the second insertion to achieve the desired result.
    const firstInsertedTexts = textEditor.selections.map((selection) => {
      const from = textEditor.document.lineAt(selection.active.line - 2).range.end;
      const to = textEditor.document.lineAt(selection.active.line - 1).range.end;
      return textEditor.document.getText(new Range(from, to));
    });
    const secondInsertedTexts = textEditor.selections.map((selection) => {
      const from = textEditor.document.lineAt(selection.active.line - 1).range.end;
      const to = textEditor.document.lineAt(selection.active.line - 0).range.end;
      return textEditor.document.getText(new Range(from, to));
    });

    // Trailing new lines can be inserted for example
    // when the cursor is inside a multi-line comment in JS like below.
    // /**| */
    // ↓
    // /**
    //  * |
    //  */
    // The `trailingNewLinesInserted` flag list represents whether such trailing new lines are inserted or not.
    // `trailingLineTexts` contains the texts of such trailing new lines.
    const trailingNewLinesInserted = textEditor.selections.map((selection, index) => {
      const initCursorAtEndOfLine = initCursorsAtEndOfLine[index];
      if (initCursorAtEndOfLine == null || initCursorAtEndOfLine === true) {
        return false;
      }
      const cursorAtEndOfLine = selection.active.isEqual(textEditor.document.lineAt(selection.active.line).range.end);
      return cursorAtEndOfLine;
    });
    const trailingLineTexts = textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted == null || trailingNewLineInserted === false) {
        return "";
      }
      const nextLineStart = textEditor.document.lineAt(selection.active.line + 1).range.start;
      return textEditor.document.getText(new Range(selection.active, nextLineStart));
    });

    await vscode.commands.executeCommand<void>("undo");
    await vscode.commands.executeCommand<void>("undo");

    await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection, index) => {
        const firstInsertedLineText = firstInsertedTexts[index];
        const secondInsertedLineText = secondInsertedTexts[index];
        const trailingLineText = trailingLineTexts[index];
        if (firstInsertedLineText == null) {
          throw new Error("firstInsertedLineText is null");
        }
        if (secondInsertedLineText == null) {
          throw new Error("secondInsertedLineText is null");
        }
        if (trailingLineText == null) {
          throw new Error("trailingLineText is null");
        }
        editBuilder.insert(
          selection.active,
          firstInsertedLineText.repeat(repeat - 1) + secondInsertedLineText + trailingLineText,
        );
      });
    });
    textEditor.selections = textEditor.selections.map((selection, index) => {
      const trailingNewLineInserted = trailingNewLinesInserted[index];
      if (trailingNewLineInserted) {
        const newActive = textEditor.document.lineAt(selection.active.line - 1).range.end;
        return new Selection(newActive, newActive);
      }
      return selection;
    });

    revealPrimaryActive(textEditor);
  }
}

function isHorizontalWhitespace(char: string): boolean {
  return char === " " || char === "\t";
}

function findHorizontalWhitespaceRange(lineText: string, cursorChar: number): [number, number] {
  let from = cursorChar;
  while (from > 0 && isHorizontalWhitespace(lineText[from - 1]!)) {
    from--;
  }
  let to = cursorChar;
  while (to < lineText.length && isHorizontalWhitespace(lineText[to]!)) {
    to++;
  }
  return [from, to];
}

interface CursorCycleData {
  lineNum: number;
  originalWhitespace: string;
  originalCursorOffset: number;
  expectedPosition: vscode.Position;
}

/**
 * Shared state for the cycle-spacing command.
 * Tracks the current cycle step and per-cursor data needed to advance the cycle.
 * Consecutive invocations are detected by comparing the current cursor positions
 * against the expected positions stored from the previous invocation.
 */
export class CycleSpacingState {
  private _step: 0 | 1 | 2 = 0;
  private _cursors: CursorCycleData[] | null = null;

  public reset(): void {
    this._step = 0;
    this._cursors = null;
  }

  public get step(): 0 | 1 | 2 {
    return this._step;
  }

  public get cursors(): readonly CursorCycleData[] | null {
    return this._cursors;
  }

  public advance(cursors: CursorCycleData[], nextStep: 1 | 2): void {
    this._cursors = cursors;
    this._step = nextStep;
  }

  public isConsecutive(currentPositions: readonly vscode.Position[]): boolean {
    if (this._step === 0 || this._cursors === null) return false;
    if (this._cursors.length !== currentPositions.length) return false;
    return this._cursors.every((cd, i) => cd.expectedPosition.isEqual(currentPositions[i]!));
  }
}

/**
 * Implements Emacs' `cycle-spacing` command (M-SPC).
 *
 * Cycles through three actions on consecutive invocations:
 *   1. Replace all horizontal whitespace around point with a single space (just-one-space).
 *   2. Delete all horizontal whitespace around point (delete-horizontal-space).
 *   3. Restore the original whitespace and cursor position.
 *
 * Any non-consecutive invocation (cursor moved between calls) resets the cycle to step 1.
 * A prefix argument sets the number of spaces inserted in step 1 (default: 1).
 */
export class CycleSpacing extends EmacsCommand {
  public readonly id = "cycleSpacing";

  constructor(
    emacsController: IEmacsController,
    private readonly cycleSpacingState: CycleSpacingState,
  ) {
    super(emacsController);
  }

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const currentPositions = textEditor.selections.map((s) => s.active);
    if (!this.cycleSpacingState.isConsecutive(currentPositions)) {
      this.cycleSpacingState.reset();
    }

    switch (this.cycleSpacingState.step) {
      case 0:
        return this.runStep1(textEditor, prefixArgument);
      case 1:
        return this.runStep2(textEditor);
      case 2:
        return this.runStep3(textEditor);
    }
  }

  // Returns selection indices sorted left-to-right, top-to-bottom for safe lineOffset tracking.
  private sortedSelectionIndices(textEditor: TextEditor): number[] {
    return [...textEditor.selections.keys()].sort((a, b) => {
      const sa = textEditor.selections[a]!;
      const sb = textEditor.selections[b]!;
      if (sa.active.line !== sb.active.line) return sa.active.line - sb.active.line;
      return sa.active.character - sb.active.character;
    });
  }

  private async runStep1(textEditor: TextEditor, prefixArgument: number | undefined): Promise<void> {
    const document = textEditor.document;
    const nSpaces = prefixArgument === undefined ? 1 : Math.max(0, prefixArgument);
    const replacement = " ".repeat(nSpaces);

    const sortedIndices = this.sortedSelectionIndices(textEditor);
    const lineOffsets = new Map<number, number>();
    const rawCursorData: Array<{ index: number; data: CursorCycleData }> = [];

    for (const i of sortedIndices) {
      const pos = textEditor.selections[i]!.active;
      const line = pos.line;
      const lineText = document.lineAt(line).text;
      const [from, to] = findHorizontalWhitespaceRange(lineText, pos.character);
      const originalWhitespace = lineText.substring(from, to);
      const originalCursorOffset = pos.character - from;
      const lineOffset = lineOffsets.get(line) ?? 0;
      const newFrom = from + lineOffset;
      const delta = nSpaces - (to - from);
      lineOffsets.set(line, lineOffset + delta);
      rawCursorData.push({
        index: i,
        data: {
          lineNum: line,
          originalWhitespace,
          originalCursorOffset,
          expectedPosition: new vscode.Position(line, newFrom + nSpaces),
        },
      });
    }

    const success = await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection) => {
        const pos = selection.active;
        const line = pos.line;
        const lineText = document.lineAt(line).text;
        const [from, to] = findHorizontalWhitespaceRange(lineText, pos.character);
        editBuilder.replace(new Range(line, from, line, to), replacement);
      });
    });

    if (!success) {
      logger.warn("cycleSpacing step1 edit failed");
      return;
    }

    const newCursors = rawCursorData.sort((a, b) => a.index - b.index).map(({ data }) => data);

    textEditor.selections = newCursors.map((cd) => {
      const pos = cd.expectedPosition;
      return new Selection(pos, pos);
    });

    this.cycleSpacingState.advance(newCursors, 1);
  }

  private async runStep2(textEditor: TextEditor): Promise<void> {
    const document = textEditor.document;
    const prevCursors = this.cycleSpacingState.cursors!;

    const sortedIndices = this.sortedSelectionIndices(textEditor);
    const lineOffsets = new Map<number, number>();
    const rawCursorData: Array<{ index: number; data: CursorCycleData }> = [];

    for (const i of sortedIndices) {
      const pos = textEditor.selections[i]!.active;
      const line = pos.line;
      const lineText = document.lineAt(line).text;
      const [from, to] = findHorizontalWhitespaceRange(lineText, pos.character);
      const lineOffset = lineOffsets.get(line) ?? 0;
      const newFrom = from + lineOffset;
      const delta = -(to - from);
      lineOffsets.set(line, lineOffset + delta);
      rawCursorData.push({
        index: i,
        data: {
          ...prevCursors[i]!,
          expectedPosition: new vscode.Position(line, newFrom),
        },
      });
    }

    const success = await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection) => {
        const pos = selection.active;
        const line = pos.line;
        const lineText = document.lineAt(line).text;
        const [from, to] = findHorizontalWhitespaceRange(lineText, pos.character);
        editBuilder.delete(new Range(line, from, line, to));
      });
    });

    if (!success) {
      logger.warn("cycleSpacing step2 edit failed");
      return;
    }

    const newCursors = rawCursorData.sort((a, b) => a.index - b.index).map(({ data }) => data);

    textEditor.selections = newCursors.map((cd) => {
      const pos = cd.expectedPosition;
      return new Selection(pos, pos);
    });

    this.cycleSpacingState.advance(newCursors, 2);
  }

  private async runStep3(textEditor: TextEditor): Promise<void> {
    const prevCursors = this.cycleSpacingState.cursors!;

    const sortedIndices = this.sortedSelectionIndices(textEditor);
    const lineOffsets = new Map<number, number>();
    const rawCursorData: Array<{ index: number; data: CursorCycleData }> = [];

    for (const i of sortedIndices) {
      const pos = textEditor.selections[i]!.active;
      const line = pos.line;
      const cd = prevCursors[i]!;
      const lineOffset = lineOffsets.get(line) ?? 0;
      const newPos = pos.character + lineOffset;
      const delta = cd.originalWhitespace.length;
      lineOffsets.set(line, lineOffset + delta);
      const restoredCursorCol = newPos + cd.originalCursorOffset;
      rawCursorData.push({
        index: i,
        data: {
          ...cd,
          expectedPosition: new vscode.Position(line, restoredCursorCol),
        },
      });
    }

    const success = await textEditor.edit((editBuilder) => {
      textEditor.selections.forEach((selection, i) => {
        const pos = selection.active;
        const cd = prevCursors[i]!;
        editBuilder.insert(pos, cd.originalWhitespace);
      });
    });

    if (!success) {
      logger.warn("cycleSpacing step3 edit failed");
      return;
    }

    const newCursors = rawCursorData.sort((a, b) => a.index - b.index).map(({ data }) => data);

    textEditor.selections = newCursors.map((cd) => {
      const pos = cd.expectedPosition;
      return new Selection(pos, pos);
    });

    // Reset to step 0: next consecutive M-SPC will restart the cycle from step 1.
    this.cycleSpacingState.reset();
  }
}
