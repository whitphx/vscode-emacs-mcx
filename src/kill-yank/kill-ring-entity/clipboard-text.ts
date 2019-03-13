import { IKillRingEntity } from "./kill-ring-entity";

export class ClipboardTextKillRingEntity implements IKillRingEntity {
    private text: string;

    constructor(clipboardText: string) {
        this.text = clipboardText;
    }

    public isSameClipboardText(clipboardText: string): boolean {
        return clipboardText === this.text;
    }

    public isEmpty(): boolean {
        return this.text === "";
    }

    public asString(): string {
        return this.text;
    }
}
