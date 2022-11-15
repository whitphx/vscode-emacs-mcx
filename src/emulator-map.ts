import { TextEditor, Uri } from "vscode";
import { EmacsEmulator } from "./emulator";
import { KillRing } from "./kill-yank/kill-ring";
import { Minibuffer } from "./minibuffer";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<Uri, EmacsEmulator>;
  private killRing: KillRing;
  private minibuffer: Minibuffer;

  constructor(killRing: KillRing, minibuffer: Minibuffer) {
    this.emacsEmulatorMap = new Map();
    this.killRing = killRing;
    this.minibuffer = minibuffer;
  }

  public getOrCreate(editor: TextEditor): [EmacsEmulator, boolean] {
    const editorId = editor.document.uri;

    let isNew = false;
    let emacsEmulator = this.get(editorId);

    if (!emacsEmulator) {
      isNew = true;
      emacsEmulator = new EmacsEmulator(editor, this.killRing, this.minibuffer);
      this.emacsEmulatorMap.set(editorId, emacsEmulator);
    }
    return [emacsEmulator, isNew];
  }

  public get(uri: Uri): EmacsEmulator | undefined {
    return this.emacsEmulatorMap.get(uri);
  }

  public keys(): Iterable<Uri> {
    return this.emacsEmulatorMap.keys();
  }

  public delete(editorId: Uri): void {
    const emulator = this.emacsEmulatorMap.get(editorId);
    if (emulator) {
      emulator.dispose();
    }
    this.emacsEmulatorMap.delete(editorId);
  }
}
