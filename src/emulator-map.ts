import { TextEditor } from "vscode";
import { EmacsEmulator } from "./emulator";
import { KillRing } from "./kill-yank/kill-ring";
import { Minibuffer } from "./minibuffer";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<string, EmacsEmulator>;
  private killRing: KillRing;
  private minibuffer: Minibuffer;
  private textRegister: Map<string, string>;

  constructor(killRing: KillRing, minibuffer: Minibuffer, textRegister: Map<string, string>) {
    this.emacsEmulatorMap = new Map();
    this.killRing = killRing;
    this.minibuffer = minibuffer;
    this.textRegister = textRegister;
  }

  public getOrCreate(editor: TextEditor): [EmacsEmulator, boolean] {
    const editorId = editor.document.uri.toString();

    let isNew = false;
    let emacsEmulator = this.get(editorId);

    if (!emacsEmulator) {
      isNew = true;
      emacsEmulator = new EmacsEmulator(editor, this.killRing, this.minibuffer, this.textRegister);
      this.emacsEmulatorMap.set(editorId, emacsEmulator);
    } else {
      emacsEmulator.setTextEditor(editor);
    }
    return [emacsEmulator, isNew];
  }

  public get(uriString: string): EmacsEmulator | undefined {
    return this.emacsEmulatorMap.get(uriString);
  }

  public keys(): Iterable<string> {
    return this.emacsEmulatorMap.keys();
  }

  public delete(editorId: string): void {
    const emulator = this.emacsEmulatorMap.get(editorId);
    if (emulator) {
      emulator.dispose();
    }
    this.emacsEmulatorMap.delete(editorId);
  }
}
