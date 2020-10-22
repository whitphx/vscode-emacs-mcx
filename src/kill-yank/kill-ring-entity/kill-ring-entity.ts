export interface IKillRingEntity {
  type: string;
  isSameClipboardText(clipboardText: string): boolean;
  isEmpty(): boolean;
  asString(): string;
}
