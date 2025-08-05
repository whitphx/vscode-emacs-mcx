import type { TextEditor } from "vscode";
import { EmacsEmulator } from "./emulator";
import type { KillRing } from "./kill-yank/kill-ring";
import type { Registers } from "./commands/registers";
import type { RectangleState } from "./commands/rectangle";
import type { RegisterCommandState } from "./commands/registers";
import type { Minibuffer } from "./minibuffer";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<string, EmacsEmulator>;

  constructor(
    private killRing: KillRing,
    private minibuffer: Minibuffer,
    private registers: Registers,
    private rectangleState: RectangleState,
    private registerCommandState: RegisterCommandState,
  ) {
    this.emacsEmulatorMap = new Map();
  }

  public getOrCreate(editor: TextEditor): [EmacsEmulator, boolean] {
    const editorId = editor.document.uri.toString();

    let isNew = false;
    let emacsEmulator = this.get(editorId);

    if (!emacsEmulator) {
      isNew = true;
      emacsEmulator = new EmacsEmulator(
        editor,
        this.killRing,
        this.minibuffer,
        this.registers,
        this.rectangleState,
        this.registerCommandState,
      );
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
