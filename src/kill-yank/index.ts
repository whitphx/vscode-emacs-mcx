import { Minibuffer } from "src/minibuffer";
import * as vscode from "vscode";
import { Position, Range, TextEditor } from "vscode";
import { MessageManager } from "../message";
import { equalPositions } from "../utils";
import type { IEmacsController } from "../emulator";
import { KillRing, KillRingEntity } from "./kill-ring";
import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { AppendDirection, EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";
import { logger } from "../logger";
import { convertSelectionToRectSelections, getRectText } from "../rectangle";
import { getEolChar } from "../commands/helpers/eol";

export { AppendDirection };

export class KillYanker implements vscode.Disposable {
  private emacsController: IEmacsController;
  private killRing: KillRing | null; // If null, killRing is disabled and only clipboard is used.
  private minibuffer: Minibuffer;

  private get textEditor(): TextEditor {
    return this.emacsController.textEditor;
  }

  private isAppending = false;
  private prevKillPositions: Position[];
  private docChangedAfterYank = false;
  private prevYankPositions: Position[];

  private textChangeCount: number;
  private prevYankChanges: number;

  private disposables: vscode.Disposable[];

  constructor(emacsController: IEmacsController, killRing: KillRing | null, minibuffer: Minibuffer) {
    this.emacsController = emacsController;
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
    if (e.textEditor === this.textEditor) {
      this.docChangedAfterYank = true;
      this.isAppending = false;
    }
  }

  public async kill(
    ranges: readonly Range[],
    rectMarkMode: boolean,
    appendDirection: AppendDirection = AppendDirection.Forward,
  ): Promise<void> {
    if (ranges.length === 0 || ranges.some((range) => range.isEmpty)) {
      this.isAppending = false;
    }
    if (!equalPositions(this.getCursorPositions(), this.prevKillPositions)) {
      this.isAppending = false;
    }

    await this.copy(ranges, rectMarkMode, this.isAppending, appendDirection);

    await this.delete(ranges, rectMarkMode);

    this.isAppending = true;
    this.prevKillPositions = this.getCursorPositions();
  }

  public async copy(
    ranges: readonly Range[],
    rectMarkMode: boolean,
    shouldAppend = false,
    appendDirection: AppendDirection = AppendDirection.Forward,
  ): Promise<void> {
    const newKillEntity = new EditorTextKillRingEntity(
      ranges.map((range) => ({
        range,
        text: rectMarkMode ? getRectText(this.textEditor.document, range) : this.textEditor.document.getText(range),
        rectMode: rectMarkMode,
      })),
      this.textEditor.document.eol,
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
      const regionTextsList = killRingEntity.getRegionTextsList();
      const shouldPasteSeparately =
        regionTextsList.length > 1 && flattenedText.split("\n").length !== regionTextsList.length;
      const canPasteSeparately = regionTextsList.length === selections.length;
      const pasteSeparately = shouldPasteSeparately && canPasteSeparately;
      const customPaste = pasteSeparately || killRingEntity.hasRectModeText();
      if (customPaste) {
        // The normal `paste` command is not suitable in this case, so we use `edit` command instead.
        if (!canPasteSeparately) {
          // `canPasteSeparately` is false, so give up to paste separately and use the first selection.
          this.textEditor.selections = [this.textEditor.selection];
        }
        const success = await this.textEditor.edit((editBuilder) => {
          selections.forEach((selection, i) => {
            if (!selection.isEmpty) {
              editBuilder.delete(selection);
            }

            // `canPasteSeparately = regionTexts.length === selections.length` has already been checked
            // or `this.selections.length === 1` is confirmed, so regionTextsList[i] is not null
            // and the `noUncheckedIndexedAccess` rule can be skipped here.

            const regionTexts = regionTextsList[i]!;

            let pasteCursor = selection.start;
            let textToAddAfterBuffer = "";
            regionTexts.forEach((regionText) => {
              const indent = pasteCursor.character;
              if (regionText.rectMode) {
                const regionHeight = regionText.range.end.line - regionText.range.start.line;
                const regionWidth = regionText.range.end.character - regionText.range.start.character;
                regionText.text.split(/\r?\n/).forEach((lineToPaste, j) => {
                  const pastedLineLength = lineToPaste.length;
                  const targetLine = pasteCursor.line + j;
                  if (targetLine < this.textEditor.document.lineCount) {
                    const existingIndent = this.textEditor.document.lineAt(targetLine).range.end.character;
                    const whiteSpacesBefore = " ".repeat(Math.max(indent - existingIndent, 0));
                    const whiteSpacesAfter = " ".repeat(Math.max(regionWidth - pastedLineLength, 0));
                    const whiteSpacesFilledLine = whiteSpacesBefore + lineToPaste + whiteSpacesAfter;
                    editBuilder.insert(new Position(targetLine, pasteCursor.character), whiteSpacesFilledLine);
                  } else {
                    const whiteSpacesBefore = " ".repeat(indent);
                    const whiteSpacesAfter = " ".repeat(regionWidth - pastedLineLength);
                    const whiteSpacesFilledLine = whiteSpacesBefore + lineToPaste + whiteSpacesAfter;
                    textToAddAfterBuffer += getEolChar(this.textEditor.document.eol) + whiteSpacesFilledLine;
                  }
                });
                pasteCursor = new Position(
                  pasteCursor.line + regionHeight, // This rect paste is different from the normal paste/edit.insert from the vertical direction perspective, so we need to update the vertical position of the cursor.
                  pasteCursor.character, // In contrast, the horizontal movement is automatically handled by the `editBuilder.insert` above internally, so we don't need to update the horizontal position of the cursor.
                );
              } else {
                if (pasteCursor.line < this.textEditor.document.lineCount) {
                  editBuilder.insert(pasteCursor, regionText.text);
                  // In this case, `pasteCursor` shouldn't be updated because `editBuilder.insert` handles it internally.
                } else {
                  textToAddAfterBuffer += regionText.text;
                  // In this case, `pasteCursor` doesn't need to be updated because `editBuilder.insert` will no longer be called after this.
                }
              }
            });
            const endOfDoc = this.textEditor.document.lineAt(this.textEditor.document.lineCount - 1).range.end;
            editBuilder.insert(endOfDoc, textToAddAfterBuffer);
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

  private async delete(ranges: readonly vscode.Range[], rectMode: boolean, maxTrials = 3): Promise<boolean> {
    const selectionsAfterRectDeleted =
      this.emacsController.inRectMarkMode &&
      this.emacsController.nativeSelections.map((selection) => {
        const newLine = selection.active.line;
        const newChar = Math.min(selection.active.character, selection.anchor.character);
        return new vscode.Selection(newLine, newChar, newLine, newChar);
      });

    const deleteRanges = rectMode
      ? ranges.flatMap((range) =>
          convertSelectionToRectSelections(this.textEditor.document, new vscode.Selection(range.start, range.end)),
        )
      : ranges;

    let success = false;
    let trial = 0;
    while (!success && trial < maxTrials) {
      success = await this.textEditor.edit((editBuilder) => {
        deleteRanges.forEach((range) => {
          editBuilder.delete(range);
        });

        if (selectionsAfterRectDeleted) {
          this.emacsController.exitMarkMode();
          this.textEditor.selections = selectionsAfterRectDeleted;
        }
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
    if (this.emacsController.inRectMarkMode) {
      return this.emacsController.nativeSelections.map((selection) => selection.active);
    } else {
      return this.textEditor.selections.map((selection) => selection.active);
    }
  }
}
