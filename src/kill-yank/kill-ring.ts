import { MessageManager } from "../message";
import { KillRingEntity } from "./kill-ring-entity";
import { quickPickKillRing } from "./browse";

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

  public getLatest(): KillRingEntity | undefined {
    if (this.killRing.length === 0) {
      return undefined;
    }

    return this.killRing[0];
  }

  public popNext(): KillRingEntity | undefined {
    if (this.pointer === null || this.killRing.length === 0) {
      return undefined;
    }

    this.pointer = (this.pointer + 1) % this.killRing.length;
    return this.killRing[this.pointer];
  }

  public addPointer(delta: number): void {
    if (this.pointer === null || this.killRing.length === 0) {
      return;
    }

    this.pointer = (this.pointer + delta + this.killRing.length) % this.killRing.length;
  }

  public async browse(): Promise<KillRingEntity | undefined> {
    MessageManager.showMessage(`${this.killRing.length} items in the kill ring.`);

    const selectedEntity = await quickPickKillRing(this.killRing, this.pointer ?? 0);
    if (selectedEntity === undefined) {
      return undefined;
    }

    const index = this.killRing.indexOf(selectedEntity);
    if (0 <= index && index < this.killRing.length) {
      this.pointer = index;
    }

    return selectedEntity;
  }
}
