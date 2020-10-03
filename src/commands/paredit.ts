import * as paredit from "paredit.js";
import { Selection, TextEditor, TextEditorRevealType } from "vscode";
import { EmacsCommand } from ".";

// Languages in which semicolon represents comment
const languagesSemicolonComment = new Set(["clojure", "lisp", "scheme"]);

abstract class PareditNavigatorCommand extends EmacsCommand {
  public abstract readonly pareditNavigatorFn: (ast: paredit.AST, idx: number) => number;

  public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
    const repeat = prefixArgument === undefined ? 1 : prefixArgument;
    if (repeat <= 0) {
      return;
    }

    const doc = textEditor.document;

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

    const newSelections = textEditor.selections.map((selection) => {
      let idx = doc.offsetAt(selection.active);

      for (let i = 0; i < repeat; ++i) {
        idx = this.pareditNavigatorFn(ast, idx);
      }

      const newActivePosition = doc.positionAt(idx);
      return new Selection(isInMarkMode ? selection.anchor : newActivePosition, newActivePosition);
    });

    textEditor.selections = newSelections;

    const primaryActiveCursor = new Selection(textEditor.selection.active, textEditor.selection.active);
    textEditor.revealRange(primaryActiveCursor, TextEditorRevealType.InCenterIfOutsideViewport);
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
