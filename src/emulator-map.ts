import { TextEditor } from "vscode";
import { EditorIdentity } from "./editorIdentity";
import { EmacsEmulator } from "./emulator";
import { KillRing } from "./kill-yank/kill-ring";
import { Minibuffer } from "./minibuffer";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<string, EmacsEmulator>;
  private killRing: KillRing;
  private minibuffer: Minibuffer;

  constructor(killRing: KillRing, minibuffer: Minibuffer) {
    this.emacsEmulatorMap = new Map();
    this.killRing = killRing;
    this.minibuffer = minibuffer;
  }

  public getOrCreate(textEditor: TextEditor): [EmacsEmulator, boolean] {
    const id = new EditorIdentity(textEditor);
    const key = id.toString();

    const existentEmulator = this.emacsEmulatorMap.get(key);
    if (existentEmulator) {
      existentEmulator.setTextEditor(textEditor);
      return [existentEmulator, false];
    }

    const newEmulator = new EmacsEmulator(textEditor, this.killRing, this.minibuffer);
    this.emacsEmulatorMap.set(key, newEmulator);
    return [newEmulator, true];
  }

  public get(key: string) {
    return this.emacsEmulatorMap.get(key);
  }

  public getKeys() {
    return this.emacsEmulatorMap.keys();
  }

  public delete(key: string) {
    const emulator = this.emacsEmulatorMap.get(key);
    if (emulator) {
      emulator.dispose();
    }
    return this.emacsEmulatorMap.delete(key);
  }
}
