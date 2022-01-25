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
    let idx = doc.offsetAt(position);

    for (let i = 0; i < repeat; ++i) {
      idx = pareditNavigatorFn(ast, idx);
    }

    return doc.positionAt(idx);
  };
};

abstract class PareditNavigatorCommand extends EmacsCommand {
  public abstract readonly pareditNavigatorFn: PareditNavigatorFn;

  public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
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

  public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      // TODO: Support negative repeats as backward navigation.
      return;
    }

    const doc = textEditor.document;

    const travelSexp = makeSexpTravelFunc(doc, paredit.navigator.forwardSexp);
    const newSelections = textEditor.selections.map((selection) => {
      const newActivePosition = travelSexp(selection.active, repeat);
      return new Selection(selection.anchor, newActivePosition);
    });

    textEditor.selections = newSelections;
    if (newSelections.some((newSelection) => !newSelection.isEmpty)) {
      this.emacsController.enterMarkMode(false);
    }

    // TODO: Print "Mark set" message

    this.emacsController.pushMark(
      newSelections.map((newSelection) => newSelection.active),
      this.continuing
    );

    revealPrimaryActive(textEditor);

    this.continuing = true;
  }

  public onDidInterruptTextEditor() {
    this.continuing = false;
  }
}

export class KillSexp extends KillYankCommand {
  public readonly id = "paredit.killSexp";

  public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
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

    await this.killYanker.kill(killRanges);

    revealPrimaryActive(textEditor);
  }
}

export class BackwardKillSexp extends KillYankCommand {
  public readonly id = "paredit.backwardKillSexp";

  public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
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

    await this.killYanker.kill(killRanges, AppendDirection.Backward);

    revealPrimaryActive(textEditor);
  }
}
