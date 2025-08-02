import * as vscode from "vscode";
import { MessageManager } from "../message";
import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";

export type KillRingEntity = ClipboardTextKillRingEntity | EditorTextKillRingEntity;

class KillRingEntityQuickPickItem implements vscode.QuickPickItem {
  public readonly label: string;

  constructor(public readonly entity: KillRingEntity) {
    this.label = entity.asString();
  }
}

export class KillRing {
  private maxNum = 60;
  private killRing: KillRingEntity[];
  private pointer: number | null;

  constructor(maxNum = 60) {
    if (maxNum) {
      this.maxNum = maxNum;
    }

    this.pointer = null;
    this.killRing = [];
  }

  public push(entity: KillRingEntity): void {
    this.killRing = [entity].concat(this.killRing);
    if (this.killRing.length > this.maxNum) {
      this.killRing = this.killRing.slice(0, this.maxNum);
    }
    this.pointer = 0;
  }

  public getTop(): KillRingEntity | undefined {
    if (this.pointer === null || this.killRing.length === 0) {
      return undefined;
    }

    return this.killRing[this.pointer];
  }

  public popNext(): KillRingEntity | undefined {
    if (this.pointer === null || this.killRing.length === 0) {
      return undefined;
    }

    this.pointer = (this.pointer + 1) % this.killRing.length;
    return this.killRing[this.pointer];
  }

  public async browse(): Promise<KillRingEntity | undefined> {
    MessageManager.showMessage(`${this.killRing.length} items in the kill ring.`);

    const disposables: vscode.Disposable[] = [];
    try {
      return await new Promise<KillRingEntity | undefined>((resolve) => {
        const input = vscode.window.createQuickPick<KillRingEntityQuickPickItem>();

        input.items = this.killRing.map((entity) => new KillRingEntityQuickPickItem(entity));

        const initialActiveItem = input.items[this.pointer ?? 0];
        input.activeItems = initialActiveItem ? [initialActiveItem] : [];

        disposables.push(
          input.onDidChangeSelection((items) => {
            const item = items[0];
            if (item) {
              resolve(item.entity);
              input.dispose();
            }
          }),
          input.onDidHide(() => {
            resolve(undefined);
            input.dispose();
          }),
        );
        input.show();
      });
    } finally {
      disposables.forEach((disposable) => {
        disposable.dispose();
      });
    }
  }
}
