import * as vscode from "vscode";
import { KillRingEntity } from "./kill-ring-entity";

// Ref: https://github.com/microsoft/vscode-extension-samples/blob/e0a4e7430cbda9310b47ffb86a07c6eaf445ffee/quickinput-sample/src/quickOpen.ts

class KillRingEntityDeleteButton implements vscode.QuickInputButton {
  public readonly iconPath = new vscode.ThemeIcon("trash");
  public readonly tooltip = "Delete";

  constructor(public readonly entity: KillRingEntity) {}
}

class KillRingEntityQuickPickItem implements vscode.QuickPickItem {
  public readonly label: string;
  public readonly buttons: vscode.QuickInputButton[];

  constructor(public readonly entity: KillRingEntity) {
    this.label = entity.asString();
    this.buttons = [new KillRingEntityDeleteButton(entity)];
  }
}

export async function quickPickKillRing(
  killRing: KillRingEntity[],
  initialActiveIndex: number,
  requestDelete: (entity: KillRingEntity) => void,
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
        input.onDidTriggerItemButton((e) => {
          if (e.button instanceof KillRingEntityDeleteButton) {
            const entityToDelete = e.button.entity;
            requestDelete(entityToDelete);
            const activeItem = input.activeItems[0];
            const newActiveItem =
              activeItem?.entity === entityToDelete
                ? (input.items[input.items.indexOf(activeItem) + 1] ?? input.items[input.items.indexOf(activeItem) - 1])
                : activeItem;
            input.items = input.items.filter((item) => item.entity !== entityToDelete);
            input.activeItems = newActiveItem ? [newActiveItem] : [];
          }
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
