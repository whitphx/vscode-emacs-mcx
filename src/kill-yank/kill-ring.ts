import { ClipboardTextKillRingEntity } from "./kill-ring-entity/clipboard-text";
import { EditorTextKillRingEntity } from "./kill-ring-entity/editor-text";

export type KillRingEntity = ClipboardTextKillRingEntity | EditorTextKillRingEntity;

export class KillRing {
  private maxNum = 60;
  private killRing: Array<KillRingEntity>;
  private pointer: number | null;

  constructor(maxNum = 60) {
    if (maxNum) {
      this.maxNum = maxNum;
    }

    this.pointer = null;
    this.killRing = [];
  }

  public push(entity: KillRingEntity): void {
    this.killRing = [entity].concat(this.killRing);
    if (this.killRing.length > this.maxNum) {
      this.killRing = this.killRing.slice(0, this.maxNum);
    }
    this.pointer = 0;
  }

  public getTop(): KillRingEntity | undefined {
    if (this.pointer === null || this.killRing.length === 0) {
      return undefined;
    }

    return this.killRing[this.pointer];
  }

  public popNext(): KillRingEntity | undefined {
    if (this.pointer === null || this.killRing.length === 0) {
      return undefined;
    }

    this.pointer = (this.pointer + 1) % this.killRing.length;
    return this.killRing[this.pointer];
  }
}
