import * as vscode from "vscode";
import { KillRingEntity } from "./kill-ring-entity";

// Ref: https://github.com/microsoft/vscode-extension-samples/blob/e0a4e7430cbda9310b47ffb86a07c6eaf445ffee/quickinput-sample/src/quickOpen.ts

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
      input.placeholder = "Kill Ring";

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
