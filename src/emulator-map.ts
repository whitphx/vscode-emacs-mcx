import { TextEditor } from "vscode";
import { EmacsEmulator } from "./emulator";
import { KillRing } from "./kill-yank/kill-ring";
import { Minibuffer } from "./minibuffer";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<TextEditor, EmacsEmulator>;
  private killRing: KillRing;
  private minibuffer: Minibuffer;

  constructor(killRing: KillRing, minibuffer: Minibuffer) {
    this.emacsEmulatorMap = new Map();
    this.killRing = killRing;
    this.minibuffer = minibuffer;
  }

  public getOrCreate(editor: TextEditor): [EmacsEmulator, boolean] {
    let isNew = false;
    let emacsEmulator = this.get(editor);

    if (!emacsEmulator) {
      isNew = true;
      emacsEmulator = new EmacsEmulator(editor, this.killRing, this.minibuffer);
      this.emacsEmulatorMap.set(editor, emacsEmulator);
    } else {
      emacsEmulator.setTextEditor(editor);
    }
    return [emacsEmulator, isNew];
  }

  public get(editor: TextEditor): EmacsEmulator | undefined {
    return this.emacsEmulatorMap.get(editor);
  }

  public keys(): Iterable<TextEditor> {
    return this.emacsEmulatorMap.keys();
  }

  public delete(editor: TextEditor): void {
    const emulator = this.emacsEmulatorMap.get(editor);
    if (emulator) {
      emulator.dispose();
    }
    this.emacsEmulatorMap.delete(editor);
  }
}
