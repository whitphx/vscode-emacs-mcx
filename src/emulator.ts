import * as vscode from "vscode";
import { Disposable, Position, Range, Selection, TextEditor } from "vscode";
import { deleteBlankLines } from "./delete-blank-lines";
import { KillRing } from "./kill-ring";
import { KillYanker } from "./kill-yank";
import { MessageManager } from "./message";
import { cursorMoves } from "./operations";
import { Recenterer } from "./recenter";

export class EmacsEmulator implements Disposable {
    private textEditor: TextEditor;

    private isInMarkMode = false;

    private killYanker: KillYanker;
    private recenterer: Recenterer;

    private isInPrefixArgumentMode = false;
    private isAcceptingPrefixArgument = false;
    private cuCount = 0;  // How many C-u are input continuously
    private prefixArgumentStr = "";  // Prefix argument string input after C-u

    constructor(textEditor: TextEditor, killRing: KillRing | null = null) {
        this.textEditor = textEditor;

        this.killYanker = new KillYanker(textEditor, killRing);
        this.recenterer = new Recenterer(textEditor);

        this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);

        // TODO: I want to use a decorator
        this.cursorMove = this.makePrefixArgumentAcceptable(this.cursorMove);
    }

    public setTextEditor(textEditor: TextEditor) {
        this.textEditor = textEditor;
        this.killYanker.setTextEditor(textEditor);
        this.recenterer.setTextEditor(textEditor);
    }

    public getTextEditor(): TextEditor {
        return this.textEditor;
    }

    public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
        // XXX: Is this a correct way to check the identity of document?
        if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
            if (e.contentChanges.some((contentChange) =>
                this.textEditor.selections.some((selection) =>
                    typeof contentChange.range.intersection(selection) !== "undefined",
                ),
            )) {
                this.exitMarkMode();
            }
        }
    }

    // tslint:disable-next-line:max-line-length
    // Ref: https://github.com/Microsoft/vscode-extension-samples/blob/f9955406b4cad550fdfa891df23a84a2b344c3d8/vim-sample/src/extension.ts#L152
    public type(text: string) {
        if (!this.isInPrefixArgumentMode) {
            // Simply delegate to the original behavior
            return vscode.commands.executeCommand("default:type", {
                text,
            });
        }

        if (this.isAcceptingPrefixArgument && !isNaN(+text)) {
            // If `text` is a numeric charactor
            this.prefixArgumentStr += text;
            return;
        }

        const prefixArgument = this.getPrefixArgument();
        if (prefixArgument === undefined) { return; }

        this.exitPrefixArgumentMode();
        const promises = [];
        for (let i = 0; i < prefixArgument; ++i) {
            const promise = vscode.commands.executeCommand("default:type", {
                text,
            });
            promises.push(promise);
        }
        // NOTE: Current implementation executes promises concurrently. Should it be sequential?
        return Promise.all(promises);
    }

    public enterPrefixArgumentMode() {
        if (this.isInPrefixArgumentMode && this.prefixArgumentStr.length > 0) {
            this.isAcceptingPrefixArgument = false;
        } else {
            this.isInPrefixArgumentMode = true;
            this.isAcceptingPrefixArgument = true;
            this.cuCount++;
            this.prefixArgumentStr = "";
        }
    }

    public exitPrefixArgumentMode() {
        this.isInPrefixArgumentMode = false;
        this.isAcceptingPrefixArgument = false;
        this.cuCount = 0;
        this.prefixArgumentStr = "";
    }

    public getPrefixArgument(): number | undefined {
        if (!this.isInPrefixArgumentMode) { return undefined; }

        const prefixArgument = parseInt(this.prefixArgumentStr, 10);
        if (isNaN(prefixArgument)) {
            return 4 ** this.cuCount;
        }
        return prefixArgument;
    }

    public cursorMove(commandName: cursorMoves, prefixArgument: number | undefined = 1) {
        // TODO: Replace to executing built-in `cursorMove` command with `value` argument
        const repeat = prefixArgument === undefined ? 1 : prefixArgument;
        if (repeat < 0) { return; }

        const promises = [];
        for (let i = 0; i < repeat; ++i) {
            const promise = vscode.commands.executeCommand(this.isInMarkMode ? `${commandName}Select` : commandName);
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    public setMarkCommand() {
        if (this.isInMarkMode && !this.hasNonEmptySelection()) {
            // Toggle if enterMarkMode is invoked continuously without any cursor move.
            this.exitMarkMode();
            MessageManager.showMessage("Mark deactivated");
        } else {
            this.enterMarkMode();
            MessageManager.showMessage("Mark activated");
        }
    }

    public addSelectionToNextFindMatch() {
        this.enterMarkMode();
        return vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch");
    }

    public addSelectionToPreviousFindMatch() {
        this.enterMarkMode();
        return vscode.commands.executeCommand("editor.action.addSelectionToPreviousFindMatch");
    }

    /**
     * Invoked by C-g
     */
    public cancel() {
        if (this.hasMultipleSelections() && !this.hasNonEmptySelection()) {
            this.stopMultiCursor();
        } else {
            this.makeSelectionsEmpty();
        }

        if (this.isInMarkMode) {
            this.exitMarkMode();
        }

        this.killYanker.cancelKillAppend();
        this.recenterer.reset();
        this.exitPrefixArgumentMode();

        MessageManager.showMessage("Quit");
    }

    public copyRegion() {
        const ranges = this.getNonEmptySelections();
        this.killYanker.copy(ranges);
        this.cancel();
    }

    public killLine() {
        const ranges = this.textEditor.selections.map((selection) => {
            const anchor = selection.anchor;
            const lineAtAnchor = this.textEditor.document.lineAt(selection.anchor.line);
            const lineEnd = lineAtAnchor.range.end;

            if (anchor.isEqual(lineEnd)) {
                // From the end of the line to the beginning of the next line
                return new Range(anchor, new Position(anchor.line + 1, 0));
            } else {
                // From the current cursor to the end of line
                return new Range(anchor, lineEnd);
            }
        });
        this.exitMarkMode();
        return this.killYanker.kill(ranges);
    }

    public killWholeLine() {
        const ranges = this.textEditor.selections.map((selection) =>
            // From the beginning of the line to the beginning of the next line
            new Range(
                new Position(selection.anchor.line, 0),
                new Position(selection.anchor.line + 1, 0),
            ),
        );
        this.exitMarkMode();
        return this.killYanker.kill(ranges);
    }

    public async killRegion(appendClipboard?: boolean) {
        const ranges = this.getNonEmptySelections();
        await this.killYanker.kill(ranges);
        this.exitMarkMode();
        this.cancelKillAppend();
    }

    public cancelKillAppend() {
        this.killYanker.cancelKillAppend();
    }

    public async yank() {
        await this.killYanker.yank();
        this.exitMarkMode();
    }

    public async yankPop() {
        await this.killYanker.yankPop();
        this.exitMarkMode();
    }

    public async newLine() {
        this.makeSelectionsEmpty();
        this.exitMarkMode();

        // XXX: How to emulate Enter key...?
        await vscode.commands.executeCommand("lineBreakInsert");

        this.textEditor.selections = this.textEditor.selections.map((selection) => {
            const lineNum = selection.active.line + 1;
            const indent = this.textEditor.document.lineAt(lineNum).firstNonWhitespaceCharacterIndex;
            const cursorPos = new Position(lineNum, indent);
            return new Selection(cursorPos, cursorPos);
        });
    }

    public deleteBlankLines() {
        return deleteBlankLines(this.textEditor);
    }

    public async transformToUppercase() {
        if (!this.hasNonEmptySelection()) {
            await this.cursorMove("cursorWordRight");
        }
        await vscode.commands.executeCommand("editor.action.transformToUppercase");
    }

    public async transformToLowercase() {
        if (!this.hasNonEmptySelection()) {
            await this.cursorMove("cursorWordRight");
        }
        await vscode.commands.executeCommand("editor.action.transformToLowercase");
    }

    public recenterTopBottom() {
        this.recenterer.recenterTopBottom();
    }

    public dispose() {
        delete this.killYanker;
        delete this.recenterer;
    }

    private enterMarkMode() {
        this.isInMarkMode = true;

        // At this moment, the only way to set the context for `when` conditions is `setContext` command.
        // The discussion is ongoing in https://github.com/Microsoft/vscode/issues/10471
        // TODO: How to write unittest for `setContext`?
        vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", true);
    }

    private exitMarkMode() {
        this.isInMarkMode = false;
        vscode.commands.executeCommand("setContext", "emacs-mcx.inMarkMode", false);
    }

    // TODO: I want to make this a decorator
    private makePrefixArgumentAcceptable(method: (...args: any[]) => any) {
        return (...args: any[]) => {
            const prefixArgument = this.getPrefixArgument();

            const ret = method.apply(this, [...args, prefixArgument]);

            this.exitPrefixArgumentMode();

            return ret;
        };
    }

    private makeSelectionsEmpty() {
        this.textEditor.selections = this.textEditor.selections.map((selection) =>
            new Selection(selection.active, selection.active));
    }

    private stopMultiCursor() {
        vscode.commands.executeCommand("removeSecondaryCursors");
    }

    private hasMultipleSelections(): boolean {
        return this.textEditor.selections.length > 1;
    }

    private hasNonEmptySelection(): boolean {
        return this.textEditor.selections.some((selection) => !selection.isEmpty);
    }

    private getNonEmptySelections(): Selection[] {
        return this.textEditor.selections.filter((selection) => !selection.isEmpty);
    }
}
