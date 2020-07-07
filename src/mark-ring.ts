import { Position } from "vscode";

export class MarkRing {
  private maxNum = 16;
  private ring: Position[][];
  private pointer: number | null;

  constructor(maxNum?: number) {
    if (maxNum) {
      this.maxNum = maxNum;
    }

    this.pointer = null;
    this.ring = [];
  }

  public push(marks: Position[]) {
    this.ring = [marks].concat(this.ring);
    if (this.ring.length > this.maxNum) {
      this.ring = this.ring.slice(0, this.maxNum);
    }
    this.pointer = 0;
  }

  public getTop(): Position[] | null {
    if (this.pointer == null || this.ring.length === 0) {
      return null;
    }

    return this.ring[this.pointer];
  }

  public pop(): Position[] | null {
    if (this.pointer == null || this.ring.length === 0) {
      return null;
    }

    this.pointer = (this.pointer + 1) % this.ring.length;
    return this.ring[this.pointer];
  }
}
