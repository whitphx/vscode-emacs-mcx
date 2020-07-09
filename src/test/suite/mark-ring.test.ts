import { Position } from "vscode";
import * as expect from "expect";
import { MarkRing } from "../../mark-ring";

suite("MarkRing", () => {
  test("push, getTop, and pop", () => {
    const markRing = new MarkRing(3);

    const entities = [[new Position(0, 1)], [new Position(2, 3)], [new Position(4, 5)], [new Position(6, 7)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    expect(markRing.getTop()).toEqual([new Position(6, 7)]);
    expect(markRing.pop()).toEqual([new Position(6, 7)]);
    expect(markRing.pop()).toEqual([new Position(4, 5)]);
    expect(markRing.pop()).toEqual([new Position(2, 3)]);
    expect(markRing.pop()).toEqual([new Position(6, 7)]);
    expect(markRing.pop()).toEqual([new Position(4, 5)]);
  });

  test("less data than max", () => {
    const markRing = new MarkRing(4);

    const entities = [[new Position(0, 1)], [new Position(2, 3)], [new Position(4, 5)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    expect(markRing.getTop()).toEqual([new Position(4, 5)]);
    expect(markRing.pop()).toEqual([new Position(4, 5)]);
    expect(markRing.pop()).toEqual([new Position(2, 3)]);
    expect(markRing.pop()).toEqual([new Position(0, 1)]);
    expect(markRing.pop()).toEqual([new Position(4, 5)]);
    expect(markRing.pop()).toEqual([new Position(2, 3)]);
    expect(markRing.pop()).toEqual([new Position(0, 1)]);
  });

  test("just single data", () => {
    const markRing = new MarkRing(3);

    const entities = [[new Position(0, 1)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    expect(markRing.getTop()).toEqual([new Position(0, 1)]);
    expect(markRing.pop()).toEqual([new Position(0, 1)]);
    expect(markRing.pop()).toEqual([new Position(0, 1)]);
  });

  test("zero data", () => {
    const markRing = new MarkRing(3);

    expect(markRing.getTop()).toBe(null);
    expect(markRing.pop()).toBe(null);
    expect(markRing.pop()).toBe(null);
  });
});
