import { Position } from "vscode";
import assert from "assert";
import { MarkRing } from "../../mark-ring";

suite("MarkRing", () => {
  test("push, getTop, and pop", () => {
    const markRing = new MarkRing(3);

    const entities = [[new Position(0, 1)], [new Position(2, 3)], [new Position(4, 5)], [new Position(6, 7)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    assert.deepStrictEqual(markRing.getTop(), [new Position(6, 7)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(6, 7)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(4, 5)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(2, 3)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(6, 7)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(4, 5)]);
  });

  test("less data than max", () => {
    const markRing = new MarkRing(4);

    const entities = [[new Position(0, 1)], [new Position(2, 3)], [new Position(4, 5)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    assert.deepStrictEqual(markRing.getTop(), [new Position(4, 5)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(4, 5)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(2, 3)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(0, 1)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(4, 5)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(2, 3)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(0, 1)]);
  });

  test("just single data", () => {
    const markRing = new MarkRing(3);

    const entities = [[new Position(0, 1)]];

    entities.forEach((entity) => {
      markRing.push(entity);
    });

    assert.deepStrictEqual(markRing.getTop(), [new Position(0, 1)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(0, 1)]);
    assert.deepStrictEqual(markRing.pop(), [new Position(0, 1)]);
  });

  test("zero data", () => {
    const markRing = new MarkRing(3);

    assert.strictEqual(markRing.getTop(), null);
    assert.strictEqual(markRing.pop(), null);
    assert.strictEqual(markRing.pop(), null);
  });
});
