import { Position } from "vscode";

export class MarkRing {
  private maxNum = 16;
  private ring: Array<readonly Position[]>;
  private pointer: number | null;

  constructor(maxNum?: number) {
    if (maxNum) {
      this.maxNum = maxNum;
    }

    this.pointer = null;
    this.ring = [];
  }

  public push(marks: readonly Position[], replace = false): void {
    if (replace) {
      this.ring[0] = marks;
    } else {
      this.ring = [marks].concat(this.ring);
      if (this.ring.length > this.maxNum) {
        this.ring = this.ring.slice(0, this.maxNum);
      }
    }
    this.pointer = 0;
  }

  public getTop(): readonly Position[] | undefined {
    if (this.pointer == null || this.ring.length === 0) {
      return undefined;
    }

    return this.ring[this.pointer];
  }

  public pop(): readonly Position[] | undefined {
    if (this.pointer == null || this.ring.length === 0) {
      return undefined;
    }

    const ret = this.ring[this.pointer];

    this.pointer = (this.pointer + 1) % this.ring.length;

    return ret;
  }
}
