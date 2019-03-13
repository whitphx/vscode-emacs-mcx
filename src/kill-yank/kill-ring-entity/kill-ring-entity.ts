export interface IKillRingEntity {
    isSameClipboardText(clipboardText: string): boolean;
    isEmpty(): boolean;
    asString(): string;
}
