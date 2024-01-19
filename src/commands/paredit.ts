import * as paredit from "paredit.js";
import { TextDocument, Selection, Range, TextEditor, Position } from "vscode";
import { EmacsCommand } from ".";
import { KillYankCommand } from "./kill";
import { AppendDirection } from "../kill-yank";
import { revealPrimaryActive } from "./helpers/reveal";

type PareditNavigatorFn = (ast: paredit.AST, idx: number) => number;

// Languages in which semicolon represents comment
const languagesSemicolonComment = new Set(["clojure", "lisp", "scheme"]);

const makeSexpTravelFunc = (doc: TextDocument, pareditNavigatorFn: PareditNavigatorFn) => {
  let src = doc.getText();
  if (!languagesSemicolonComment.has(doc.languageId)) {
    // paredit.js treats semicolon as comment in a manner of lisp and this behavior is not configurable
    // (a literal ";" is hard coded in paredit.js).
    // However, in other languages, semicolon should be treated as one entity, but not comment for convenience.
    // To do so, ";" is replaced with another character which is not treated as comment by paredit.js
    // if the document is not lisp or lisp-like languages.
    src = src.split(";").join("_"); // split + join = replaceAll
  }
  const ast = paredit.parse(src);

  return (position: Position, repeat: number): Position => {
    if (repeat < 0) {
      throw new Error(`Invalid repetition ${repeat}`);
    }

    let idx = doc.offsetAt(position);

    for (let i = 0; i < repeat; ++i) {
      idx = pareditNavigatorFn(ast, idx);
    }

    return doc.positionAt(idx);
  };
};

abstract class PareditNavigatorCommand extends EmacsCommand {
  public abstract readonly pareditNavigatorFn: PareditNavigatorFn;

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const doc = textEditor.document;

    const travelSexp = makeSexpTravelFunc(doc, this.pareditNavigatorFn);
    const newSelections = textEditor.selections.map((selection) => {
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Selection(isInMarkMode ? selection.anchor : newActivePosition, newActivePosition);
    });

    textEditor.selections = newSelections;

    revealPrimaryActive(textEditor);
  }
}

export class ForwardSexp extends PareditNavigatorCommand {
  public readonly id = "paredit.forwardSexp";
  public readonly pareditNavigatorFn = paredit.navigator.forwardSexp;
}

export class BackwardSexp extends PareditNavigatorCommand {
  public readonly id = "paredit.backwardSexp";
  public readonly pareditNavigatorFn = paredit.navigator.backwardSexp;
}

export class ForwardDownSexp extends PareditNavigatorCommand {
  public readonly id = "paredit.forwardDownSexp";
  public readonly pareditNavigatorFn = paredit.navigator.forwardDownSexp;
}

export class BackwardUpSexp extends PareditNavigatorCommand {
  public readonly id = "paredit.backwardUpSexp";
  public readonly pareditNavigatorFn = paredit.navigator.backwardUpSexp;
}

export class MarkSexp extends EmacsCommand {
  public readonly id = "paredit.markSexp";
  private continuing = false;

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const arg = prefixArgument === undefined ? 1 : prefixArgument;

    const repeat = Math.abs(arg);
    const navigatorFn = arg > 0 ? paredit.navigator.forwardSexp : paredit.navigator.backwardSexp;

    const doc = textEditor.document;

    const travelSexp = makeSexpTravelFunc(doc, navigatorFn);
    const newSelections = textEditor.selections.map((selection) => {
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Selection(selection.anchor, newActivePosition);
    });

    textEditor.selections = newSelections;
    if (newSelections.some((newSelection) => !newSelection.isEmpty)) {
      this.emacsController.enterMarkMode(false);
    }

    // TODO: Print "Mark set" message. With the current implementation, the message will disappear just after showing because MessageManager.onInterupt() is asynchronously called for setting the new selections and revealPrimaryActive() below.

    this.emacsController.pushMark(
      newSelections.map((newSelection) => newSelection.active),
      this.continuing,
    );

    revealPrimaryActive(textEditor);

    this.continuing = true;
  }

  public onDidInterruptTextEditor(): void {
    this.continuing = false;
  }
}

export class KillSexp extends KillYankCommand {
  public readonly id = "paredit.killSexp";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const doc = textEditor.document;

    const travelSexp = makeSexpTravelFunc(doc, paredit.navigator.forwardSexp);
    const killRanges = textEditor.selections.map((selection) => {
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Range(selection.anchor, newActivePosition);
    });

    await this.killYanker.kill(killRanges, false);

    revealPrimaryActive(textEditor);
  }
}

export class BackwardKillSexp extends KillYankCommand {
  public readonly id = "paredit.backwardKillSexp";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const doc = textEditor.document;

    const travelSexp = makeSexpTravelFunc(doc, paredit.navigator.backwardSexp);
    const killRanges = textEditor.selections.map((selection) => {
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Range(selection.anchor, newActivePosition);
    });

    await this.killYanker.kill(killRanges, false, AppendDirection.Backward);

    revealPrimaryActive(textEditor);
  }
}

export class PareditKill extends KillYankCommand {
  public readonly id = "paredit.pareditKill";

  public async run(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined): Promise<void> {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const doc = textEditor.document;
    const src = doc.getText(); // TODO: doc.getText is called a second time, in makeSexpTravelFunc

    const killRanges = textEditor.selections.map((selection) => {
      const navigatorFn: PareditNavigatorFn = (ast: paredit.AST, idx: number) => {
        while (src[idx] == " " || src[idx] == "\t") {
          idx += 1;
        }
        const lineNumber = selection.active.line;
        const line = textEditor.document.lineAt(lineNumber);
        const lineEnd = doc.offsetAt(line.range.end);
        if (idx >= lineEnd) {
          const nextLine = textEditor.document.lineAt(lineNumber + 1);
          return doc.offsetAt(nextLine.range.start);
        } else {
          let curr = idx;
          let prev;
          do {
            prev = curr;
            curr = this.indexAfterKillSexp(ast, prev);
          } while (prev < curr && curr < lineEnd);
          return curr;
        }
      };
      const travelSexp = makeSexpTravelFunc(doc, navigatorFn);
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Range(selection.anchor, newActivePosition);
    });

    await this.killYanker.kill(
      killRanges.filter((range) => !range.isEmpty),
      false,
    );

    revealPrimaryActive(textEditor);
  }

  private indexAfterKillSexp(ast: paredit.AST, currentIdx: number): number {
    const src = ""; // src argument is not used by paredit.editor.killSexp
    const edits = paredit.editor.killSexp(ast, src, currentIdx, { count: 1 });
    if (edits === null) {
      return currentIdx;
    } else if (edits.changes[0] !== undefined) {
      const [op, at, nChars] = edits.changes[0];
      if (op == "remove" && at == currentIdx && edits.newIndex == currentIdx && typeof nChars == "number") {
        return at + nChars;
      } else {
        throw new Error(
          "Expected paredit.editor.killSexp to return a single deletion starting at the current cursor position and leaving the cursor at the same position",
        );
      }
    } else {
      throw new Error("Expected paredit.editor.killSexp to return a single change");
    }
  }
}
