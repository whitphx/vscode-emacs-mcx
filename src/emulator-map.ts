import { Disposable, TextEditor } from "vscode";
import { EditorIdentity } from "./editorIdentity";
import { EmacsEmulator } from "./emulator";

export class EmacsEmulatorMap implements Disposable {
    private emacsEmulatorMap: Map<string, EmacsEmulator>;

    constructor() {
        this.emacsEmulatorMap = new Map();
    }

    public getOrCreate(textEditor: TextEditor): [EmacsEmulator, boolean] {
        const id = new EditorIdentity(textEditor);
        const key = id.toString();

        const existentEmulator = this.emacsEmulatorMap.get(key);
        if (existentEmulator) {
            existentEmulator.setTextEditor(textEditor);
            return [existentEmulator, false];
        }

        const newEmulator = new EmacsEmulator(textEditor);
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
        return this.emacsEmulatorMap.delete(key);
    }

    public dispose() {
        delete this.emacsEmulatorMap;
    }
}
