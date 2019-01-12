import { Range } from "vscode";
import { IKillRingEntity } from "./kill-ring-entity";

type SelectedText = {
    text: string,
    range: Range,
}

export class EditorTextKillRingEntity implements IKillRingEntity {
    private selectedTexts: SelectedText[];

    constructor(selectedTexts: SelectedText[]) {
        this.selectedTexts = selectedTexts;
    }

    public isSameClipboardText(clipboardText: string): boolean {
        return this.asString() === clipboardText;
    }

    // TODO: Cache the result of this method because it is called repeatedly
    public asString(): string {
        const sortedSelectedTexts = this.selectedTexts
            .sort((a, b) => {
                if (a.range.start.line === b.range.start.line) {
                    return a.range.start.character - b.range.start.character;
                } else {
                    return a.range.start.line - b.range.start.line;
                }
            });

        let allText = "";
        sortedSelectedTexts.forEach((item, i) => {
           const prevItem = sortedSelectedTexts[i - 1];
           if (prevItem && prevItem.range.start.line !== item.range.start.line) {
               allText += "\n" + item.text;
           } else {
               allText += item.text;
           }
        });

        return allText;
    }
}
