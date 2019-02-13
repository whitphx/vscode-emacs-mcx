import * as paredit from "paredit.js";
import { Selection } from "vscode";
import { EmacsEmulator } from "./emulator";

export class Paredit {
    private emulator: EmacsEmulator;

    constructor(emulator: EmacsEmulator) {
        this.emulator = emulator;
    }

    public forwardSexp() {
        this.wrapNavigationCommand(paredit.navigator.forwardSexp);
    }

    public backwardSexp() {
        this.wrapNavigationCommand(paredit.navigator.backwardSexp);
    }

    // TODO: Support other operations implemented by paredit.js

    private wrapNavigationCommand(fn: (ast: paredit.AST, idx: number) => number) {
        const textEditor = this.emulator.getTextEditor();
        const preserveSelect = this.emulator.isInMarkMode;

        const doc = textEditor.document;
        const src = doc.getText();
        const ast = paredit.parse(src);

        const newSelections = textEditor.selections.map((selection) => {
            const idx = doc.offsetAt(selection.active);
            const newIdx = fn(ast, idx);
            const newActivePosition = doc.positionAt(newIdx);
            return new Selection(
                preserveSelect ? selection.anchor : newActivePosition,
                newActivePosition);
        });

        textEditor.selections = newSelections;
    }
}
