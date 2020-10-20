import * as vscode from "vscode";
import { Position, Range, TextEditor } from "vscode";
import { EditorIdentity } from "../editorIdentity";
import { MessageManager } from "../message";
import { equalPositons } from "../utils";
import { KillRing } from "./kill-ring";
import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";

export enum AppendDirection {
  Forward,
  Backward,
}

export class KillYanker {
  private textEditor: TextEditor;
  private killRing: KillRing | null; // If null, killRing is disabled and only clipboard is used.

  private isAppending = false;
  private prevKillPositions: Position[];
  private docChangedAfterYank = false;
  private prevYankPositions: Position[];

  private textChangeCount: number;
  private prevYankChanges: number;

  constructor(textEditor: TextEditor, killRing: KillRing | null) {
    this.textEditor = textEditor;
    this.killRing = killRing;

    this.docChangedAfterYank = false;
    this.prevKillPositions = [];
    this.prevYankPositions = [];

    this.textChangeCount = 0; // This is used in yank and yankPop to set `this.prevYankChanges`.
    this.prevYankChanges = 0; // Indicates how many document changes happened in the previous yank or yankPop. This is usually 1, but can be 2 if auto-indent occurred by formatOnPaste setting.

    this.onDidChangeTextDocument = this.onDidChangeTextDocument.bind(this);
    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument); // TODO: Handle the returned disposable
    this.onDidChangeTextEditorSelection = this.onDidChangeTextEditorSelection.bind(this);
    vscode.window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection); // TODO: Handle the returned disposable
  }

  public setTextEditor(textEditor: TextEditor) {
    this.textEditor = textEditor;
  }

  public getTextEditor(): TextEditor {
    return this.textEditor;
  }

  public onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
    // XXX: Is this a correct way to check the identity of document?
    if (e.document.uri.toString() === this.textEditor.document.uri.toString()) {
      this.docChangedAfterYank = true;
      this.isAppending = false;
    }

    this.textChangeCount++;
  }

  public onDidChangeTextEditorSelection(e: vscode.TextEditorSelectionChangeEvent) {
    if (new EditorIdentity(e.textEditor).isEqual(new EditorIdentity(this.textEditor))) {
      this.docChangedAfterYank = true;
      this.isAppending = false;
    }
  }

  public async kill(ranges: Range[], appendDirection: AppendDirection = AppendDirection.Forward) {
    if (!equalPositons(this.getCursorPositions(), this.prevKillPositions)) {
      this.isAppending = false;
    }

    await this.copy(ranges, this.isAppending, appendDirection);

    await this.delete(ranges);

    this.isAppending = true;
    this.prevKillPositions = this.getCursorPositions();
  }

  public async copy(ranges: Range[], shouldAppend = false, appendDirection: AppendDirection = AppendDirection.Forward) {
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

  public cancelKillAppend() {
    this.isAppending = false;
  }

  public async yank() {
    if (this.killRing === null) {
      return vscode.commands.executeCommand("editor.action.clipboardPasteAction");
    }

    const clipboardText = await vscode.env.clipboard.readText();
    const killRingEntity = this.killRing.getTop();

    let pasteText: string;
    if (killRingEntity === null || !killRingEntity.isSameClipboardText(clipboardText)) {
      this.killRing.push(new ClipboardTextKillRingEntity(clipboardText));
      pasteText = clipboardText;
    } else {
      pasteText = killRingEntity.asString();
    }

    this.textChangeCount = 0;
    await vscode.commands.executeCommand("paste", { text: pasteText });
    this.prevYankChanges = this.textChangeCount;

    this.docChangedAfterYank = false;
    this.prevYankPositions = this.textEditor.selections.map((selection) => selection.active);
  }

  public async yankPop() {
    if (this.killRing === null) {
      return;
    }

    if (this.isYankInterupted()) {
      MessageManager.showMessage("Previous command was not a yank");
      return;
    }

    const prevKillRingEntity = this.killRing.getTop();

    const killRingEntity = this.killRing.popNext();
    if (killRingEntity === null) {
      return;
    }
    const text = killRingEntity.asString();

    if (prevKillRingEntity !== null && !prevKillRingEntity.isEmpty() && this.prevYankChanges > 0) {
      for (let i = 0; i < this.prevYankChanges; ++i) {
        await vscode.commands.executeCommand("undo");
      }
    }

    this.textChangeCount = 0;
    await vscode.commands.executeCommand("paste", { text });
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

  private isYankInterupted(): boolean {
    if (this.docChangedAfterYank) {
      return true;
    }

    const currentActives = this.getCursorPositions();
    return !equalPositons(currentActives, this.prevYankPositions);
  }

  private getCursorPositions(): Position[] {
    return this.textEditor.selections.map((selection) => selection.active);
  }
}
