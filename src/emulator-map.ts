import type { TextEditor, ExtensionContext } from "vscode";
import type { EmacsEmulator } from "./emulator";

export class EmacsEmulatorMap {
  private emacsEmulatorMap: Map<string, EmacsEmulator>;

  constructor(
    private context: ExtensionContext,
    private factory: (textEditor: TextEditor) => EmacsEmulator,
  ) {
    this.emacsEmulatorMap = new Map();
  }

  public getOrCreate(editor: TextEditor): EmacsEmulator {
    const documentId = editor.document.uri.toString();

    const emacsEmulator = this.get(documentId);
    if (emacsEmulator) {
      return emacsEmulator;
    }

    const newEmacsEmulator = this.factory(editor);
    this.emacsEmulatorMap.set(documentId, newEmacsEmulator);
    this.context.subscriptions.push(newEmacsEmulator);
    return newEmacsEmulator;
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
