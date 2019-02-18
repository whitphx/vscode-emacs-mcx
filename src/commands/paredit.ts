// tslint:disable:max-classes-per-file
import * as paredit from "paredit.js";
import { Selection, TextEditor, TextEditorRevealType } from "vscode";
import { EmacsCommand } from ".";

abstract class PareditNavigatorCommand extends EmacsCommand {
    public abstract readonly pareditNavigatorFn: (ast: paredit.AST, idx: number) => number;

    public async execute(textEditor: TextEditor, isInMarkMode: boolean, prefixArgument: number | undefined) {
        const preserveSelect = isInMarkMode;

        const doc = textEditor.document;
        const src = doc.getText();
        const ast = paredit.parse(src);

        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        if (repeat <= 0) { return; }

        for (let i = 0; i < repeat; ++i) {
            const newSelections = textEditor.selections.map((selection) => {
                const idx = doc.offsetAt(selection.active);
                const newIdx = this.pareditNavigatorFn(ast, idx);
                const newActivePosition = doc.positionAt(newIdx);
                return new Selection(
                    preserveSelect ? selection.anchor : newActivePosition,
                    newActivePosition);
            });

            textEditor.selections = newSelections;
        }

        textEditor.revealRange(textEditor.selection, TextEditorRevealType.InCenterIfOutsideViewport);
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
