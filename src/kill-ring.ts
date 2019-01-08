import { Disposable } from "vscode";

export class KillRing implements Disposable {
    private maxNum = 60;
    private killRing: string[];
    private pointer: number | null;

    constructor(maxNum = 60) {
        if (maxNum) {
            this.maxNum = maxNum;
        }

        this.pointer = null;
        this.killRing = [];
    }

    public push(text: string) {
        this.killRing = [text].concat(this.killRing);
        if (this.killRing.length > this.maxNum) {
            this.killRing = this.killRing.slice(0, this.maxNum);
        }
        this.pointer = 0;
    }

    public getTop(): string | null {
        if (this.pointer === null || this.killRing.length === 0) {
            return null;
        }

        return this.killRing[this.pointer];
    }

    public pop(): string | null {
        if (this.pointer === null || this.killRing.length === 0) {
            return null;
        }

        this.pointer = (this.pointer + 1) % this.killRing.length;
        return this.killRing[this.pointer];
    }

    public dispose() {
        delete this.killRing;
    }
}
