import { IKillRingEntity } from "./kill-ring-entity/kill-ring-entity";

export class KillRing {
  private maxNum = 60;
  private killRing: IKillRingEntity[];
  private pointer: number | null;

  constructor(maxNum = 60) {
    if (maxNum) {
      this.maxNum = maxNum;
    }

    this.pointer = null;
    this.killRing = [];
  }

  public push(entity: IKillRingEntity) {
    this.killRing = [entity].concat(this.killRing);
    if (this.killRing.length > this.maxNum) {
      this.killRing = this.killRing.slice(0, this.maxNum);
    }
    this.pointer = 0;
  }

  public getTop(): IKillRingEntity | null {
    if (this.pointer === null || this.killRing.length === 0) {
      return null;
    }

    return this.killRing[this.pointer];
  }

  public popNext(): IKillRingEntity | null {
    if (this.pointer === null || this.killRing.length === 0) {
      return null;
    }

    this.pointer = (this.pointer + 1) % this.killRing.length;
    return this.killRing[this.pointer];
  }
}
