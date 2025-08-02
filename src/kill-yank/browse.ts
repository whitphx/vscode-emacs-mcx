import * as vscode from "vscode";
import { KillRingEntity } from "./kill-ring-entity";

class KillRingEntityQuickPickItem implements vscode.QuickPickItem {
  public readonly label: string;

  constructor(public readonly entity: KillRingEntity) {
    this.label = entity.asString();
  }
}

export async function quickPickKillRing(
  killRing: KillRingEntity[],
  initialActiveIndex: number,
): Promise<KillRingEntity | undefined> {
  const disposables: vscode.Disposable[] = [];
  try {
    return await new Promise<KillRingEntity | undefined>((resolve) => {
      const input = vscode.window.createQuickPick<KillRingEntityQuickPickItem>();

      input.items = killRing.map((entity) => new KillRingEntityQuickPickItem(entity));

      const initialActiveItem = input.items[initialActiveIndex];
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
