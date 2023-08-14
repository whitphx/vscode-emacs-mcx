import { Minibuffer } from "src/minibuffer";
import * as vscode from "vscode";
import { Position, Range, TextEditor } from "vscode";
import { MessageManager } from "../message";
import { equalPositions } from "../utils";
import { KillRing, KillRingEntity } from "./kill-ring";
import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { AppendDirection, EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";
import { logger } from "../logger";

export { AppendDirection };

export class KillYanker implements vscode.Disposable {
  private textEditor: TextEditor;
  private killRing: KillRing | null; // If null, killRing is disabled and only clipboard is used.
  private minibuffer: Minibuffer;

  private isAppending = false;
  private prevKillPositions: Position[];
  private docChangedAfterYank = false;
  private prevYankPositions: Position[];

  private textChangeCount: number;
  private prevYankChanges: number;

  private disposables: vscode.Disposable[];

  constructor(textEditor: TextEditor, killRing: KillRing | null, minibuffer: Minibuffer) {
    this.textEditor = textEditor;
    this.killRing = killRing;
    this.minibuffer = minibuffer;

    this.docChangedAfterYank = false;
    this.prevKillPositions = [];
    this.prevYankPositions = [];

    this.textChangeCount = 0; // This is used in yank and yankPop to set `this.prevYankChanges`.
    this.prevYankChanges = 0; // Indicates how many document changes happened in the previous yank or yankPop. This is usually 1, but can be 2 if auto-indent occurred by formatOnPaste setting.

    this.disposables = [];

    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, this.disposables);
    vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection, this, this.disposables);
  }

  public setTextEditor(textEditor: TextEditor): void {
    this.textEditor = textEditor;
  }

  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent): void {
    // XXX: Is this a correct way to check the identity of document?
    if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
      this.docChangedAfterYank = true;
      this.isAppending = false;
    }

    this.textChangeCount++;
  }

  public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent): void {
    const targetEditorId = e.textEditor.document.uri.toString();
    const thisEditorId = this.textEditor.document.uri.toString();
    if (targetEditorId === thisEditorId) {
      this.docChangedAfterYank = true;
      this.isAppending = false;
    }
  }

  public async kill(ranges: Range[], appendDirection: AppendDirection = AppendDirection.Forward): Promise<void> {
    if (!equalPositions(this.getCursorPositions(), this.prevKillPositions)) {
      this.isAppending = false;
    }

    await this.copy(ranges, this.isAppending, appendDirection);

    await this.delete(ranges);

    this.isAppending = true;
    this.prevKillPositions = this.getCursorPositions();
  }

  public async copy(
    ranges: Range[],
    shouldAppend = false,
    appendDirection: AppendDirection = AppendDirection.Forward
  ): Promise<void> {
    const newKillEntity = new EditorTextKillRingEntity(
      ranges.map((range) => ({
        range,
        text: this.textEditor.document.getText(range),
      }))
    );

    if (this.killRing !== null) {
      const currentKill = this.killRing.getTop();
      if (shouldAppend && currentKill instanceof EditorTextKillRingEntity) {
        currentKill.append(newKillEntity, appendDirection);
        await vscode.env.clipboard.writeText(currentKill.asString());
      } else {
        this.killRing.push(newKillEntity);
        await vscode.env.clipboard.writeText(newKillEntity.asString());
      }
    } else {
      await vscode.env.clipboard.writeText(newKillEntity.asString());
    }
  }

  public cancelKillAppend(): void {
    this.isAppending = false;
  }

  private async pasteString(text: string): Promise<void> {
    if (this.minibuffer.isReading) {
      this.minibuffer.paste(text);
      return;
    }

    return vscode.commands.executeCommand("paste", { text });
  }

  private async pasteKillRingEntity(killRingEntity: KillRingEntity): Promise<void> {
    const flattenedText = killRingEntity.asString();

    if (this.minibuffer.isReading) {
      this.minibuffer.paste(flattenedText);
      return;
    }

    if (killRingEntity.type === "editor") {
      const selections = this.textEditor.selections;
      const regionTexts = killRingEntity.getRegionTextsList();
      const shouldPasteSeparately = regionTexts.length > 1 && flattenedText.split("\n").length !== regionTexts.length;
      if (shouldPasteSeparately && regionTexts.length === selections.length) {
        const success = await this.textEditor.edit((editBuilder) => {
          selections.forEach((selection, i) => {
            if (!selection.isEmpty) {
              editBuilder.delete(selection);
            }
            // `regionTexts.length === selections.length` has already been checked,
            // so noUncheckedIndexedAccess rule can be skipped here.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            editBuilder.insert(selection.start, regionTexts[i]!.getAppendedText());
          });
        });
        if (!success) {
          logger.warn("Failed to paste kill ring entity");
        }
        return;
      }
    }

    await vscode.commands.executeCommand("paste", { text: flattenedText });
  }

  public async yank(): Promise<void> {
    if (this.killRing === null) {
      const text = await vscode.env.clipboard.readText();
      return this.pasteString(text);
    }

    const clipboardText = await vscode.env.clipboard.readText();
    let killRingEntityToPaste = this.killRing.getTop();

    if (killRingEntityToPaste == null || !killRingEntityToPaste.isSameClipboardText(clipboardText)) {
      const newClipboardTextKillRingEntity = new ClipboardTextKillRingEntity(clipboardText);
      this.killRing.push(newClipboardTextKillRingEntity);
      killRingEntityToPaste = newClipboardTextKillRingEntity;
    }

    this.textChangeCount = 0;
    await this.pasteKillRingEntity(killRingEntityToPaste);
    this.prevYankChanges = this.textChangeCount;

    this.docChangedAfterYank = false;
    this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
  }

  public async yankPop(): Promise<void> {
    if (this.killRing === null) {
      return;
    }

    if (this.isYankInterrupted()) {
      MessageManager.showMessage("Previous command was not a yank");
      return;
    }

    const prevKillRingEntity = this.killRing.getTop();

    const killRingEntity = this.killRing.popNext();
    if (killRingEntity == null) {
      return;
    }

    if (prevKillRingEntity != null && !prevKillRingEntity.isEmpty() && this.prevYankChanges > 0) {
      for (let i = 0; i < this.prevYankChanges; ++i) {
        await vscode.commands.executeCommand("undo");
      }
    }

    this.textChangeCount = 0;
    await this.pasteKillRingEntity(killRingEntity);
    this.prevYankChanges = this.textChangeCount;

    this.docChangedAfterYank = false;
    this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
  }

  private async delete(ranges: vscode.Range[], maxTrials = 3): Promise<boolean> {
    let success = false;
    let trial = 0;
    while (!success && trial < maxTrials) {
      success = await this.textEditor.edit((editBuilder) => {
        ranges.forEach((range) => {
          editBuilder.delete(range);
        });
      });
      trial++;
    }

    return success;
  }

  private isYankInterrupted(): boolean {
    if (this.docChangedAfterYank) {
      return true;
    }

    const currentActives = this.getCursorPositions();
    return !equalPositions(currentActives, this.prevYankPositions);
  }

  private getCursorPositions(): Position[] {
    return this.textEditor.selections.map((selection) => selection.active);
  }
}
