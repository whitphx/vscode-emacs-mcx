import * as vscode from "vscode";
import { Position, Range, TextDocument, TextEditor } from "vscode";
import { EmacsCommand } from ".";
import { IEmacsController } from "../emulator";
import { AppendDirection, KillYanker } from "../kill-yank";
import { Configuration } from "../configuration/configuration";
import { WordCharacterClassifier, getMapForWordSeparators } from "vs/editor/common/controller/wordCharacterClassifier";
import { findNextWordEnd, findPreviousWordStart } from "./helpers/wordOperations";
import { revealPrimaryActive } from "./helpers/reveal";
import { getNonEmptySelections, makeSelectionsEmpty } from "./helpers/selection";

function getWordSeparators(): WordCharacterClassifier {
  // Ref: https://github.com/VSCodeVim/Vim/blob/91ca71f8607458c0558f9aff61e230c6917d4b51/src/configuration/configuration.ts#L155
  const activeTextEditor = vscode.window.activeTextEditor;
  const resource = activeTextEditor ? activeTextEditor.document.uri : null;
  const maybeWordSeparators = vscode.workspace.getConfiguration("editor", resource).wordSeparators;
  // Ref: https://github.com/microsoft/vscode/blob/bc9f2577cd8e297b003e5ca652e19685504a1e50/src/vs/editor/contrib/wordOperations/wordOperations.ts#L45
  return getMapForWordSeparators(typeof maybeWordSeparators === "string" ? maybeWordSeparators : "");
}

export abstract class KillYankCommand extends EmacsCommand {
  protected killYanker: KillYanker;

  public constructor(emacsController: IEmacsController, killYanker: KillYanker) {
    super(emacsController);

    this.killYanker = killYanker;
  }
}

function findNextKillWordRange(doc: TextDocument, position: Position, repeat = 1) {
  if (repeat <= 0) {
    throw new Error(`Invalid repeat ${repeat}`);
  }

  const wordSeparators = getWordSeparators();

  let wordEnd = position;
  for (let i = 0; i < repeat; ++i) {
    wordEnd = findNextWordEnd(doc, wordSeparators, wordEnd);
  }

  const range = new Range(position, wordEnd);
  return range.isEmpty ? undefined : range;
}

export class KillWord extends KillYankCommand {
  public readonly id = "killWord";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const killRanges = textEditor.selections
      .map((selection) => findNextKillWordRange(textEditor.document, selection.active, repeat))
      .filter(<T>(maybeRange: T | undefined): maybeRange is T => maybeRange != null);
    await this.killYanker.kill(killRanges);
    revealPrimaryActive(textEditor);
  }
}

function findPreviousKillWordRange(doc: TextDocument, position: Position, repeat = 1) {
  if (repeat <= 0) {
    throw new Error(`Invalid repeat ${repeat}`);
  }

  const wordSeparators = getWordSeparators();

  let wordStart = position;
  for (let i = 0; i < repeat; ++i) {
    wordStart = findPreviousWordStart(doc, wordSeparators, wordStart);
  }

  const range = new Range(wordStart, position);

  return range.isEmpty ? undefined : range;
}

export class BackwardKillWord extends KillYankCommand {
  public readonly id = "backwardKillWord";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const killRanges = textEditor.selections
      .map((selection) => findPreviousKillWordRange(textEditor.document, selection.active, repeat))
      .filter(<T>(maybeRange: T | undefined): maybeRange is T => maybeRange != null);
    await this.killYanker.kill(killRanges, AppendDirection.Backward);
    revealPrimaryActive(textEditor);
  }
}

export class KillLine extends KillYankCommand {
  public readonly id = "killLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const killWholeLine = Configuration.instance.killWholeLine;

    const ranges = textEditor.selections.map((selection) => {
      const cursor = selection.active;
      const lineAtCursor = textEditor.document.lineAt(cursor.line);

      if (prefixArgument !== undefined) {
        return new Range(cursor, new Position(cursor.line + prefixArgument, 0));
      }

      if (killWholeLine && cursor.character === 0) {
        return new Range(cursor, new Position(cursor.line + 1, 0));
      }

      const lineEnd = lineAtCursor.range.end;

      if (cursor.isEqual(lineEnd)) {
        // From the end of the line to the beginning of the next line
        return new Range(cursor, new Position(cursor.line + 1, 0));
      } else {
        // From the current cursor to the end of line
        return new Range(cursor, lineEnd);
      }
    });
    this.emacsController.exitMarkMode();
    return this.killYanker.kill(ranges).then(() => revealPrimaryActive(textEditor));
  }
}

export class KillWholeLine extends KillYankCommand {
  public readonly id = "killWholeLine";

  public execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Thenable<void> {
    const ranges = textEditor.selections.map(
      (selection) =>
        // From the beginning of the line to the beginning of the next line
        new Range(new Position(selection.active.line, 0), new Position(selection.active.line + 1, 0)),
    );
    this.emacsController.exitMarkMode();
    return this.killYanker.kill(ranges).then(() => revealPrimaryActive(textEditor));
  }
}

export class KillRegion extends KillYankCommand {
  public readonly id = "killRegion";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    const selectionsAfterRectDisabled =
      this.emacsController.inRectMarkMode &&
      this.emacsController.nativeSelections.map((selection) => {
        const newLine = selection.active.line;
        const newChar = Math.min(selection.active.character, selection.anchor.character);
        return new vscode.Selection(newLine, newChar, newLine, newChar);
      });

    const ranges = getNonEmptySelections(textEditor);
    await this.killYanker.kill(ranges);
    if (selectionsAfterRectDisabled) {
      textEditor.selections = selectionsAfterRectDisabled;
    }
    revealPrimaryActive(textEditor);

    this.emacsController.exitMarkMode();
    this.killYanker.cancelKillAppend();
  }
}

// TODO: Rename to kill-ring-save (original emacs command name)
export class CopyRegion extends KillYankCommand {
  public readonly id = "copyRegion";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    const ranges = getNonEmptySelections(textEditor);
    await this.killYanker.copy(ranges);
    this.emacsController.exitMarkMode();
    this.killYanker.cancelKillAppend();
    makeSelectionsEmpty(textEditor);
    revealPrimaryActive(textEditor);
  }
}

export class Yank extends KillYankCommand {
  public readonly id = "yank";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    this.emacsController.pushMark(textEditor.selections.map((selection) => selection.active));
    await this.killYanker.yank();
    this.emacsController.exitMarkMode();
    revealPrimaryActive(textEditor);
  }
}

export class YankPop extends KillYankCommand {
  public readonly id = "yankPop";

  public async execute(
    textEditor: TextEditor,
    isInMarkMode: boolean,
    prefixArgument: number | undefined,
  ): Promise<void> {
    await this.killYanker.yankPop();
    this.emacsController.exitMarkMode();
    revealPrimaryActive(textEditor);
  }
}
