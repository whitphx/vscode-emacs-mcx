import assert from "assert";
import { KillRing } from "../../kill-yank/kill-ring";
import { ClipboardTextKillRingEntity } from "../../kill-yank/kill-ring-entity/clipboard-text";

suite("KillRing", () => {
  test("push, getTop, and popNext", () => {
    const killRing = new KillRing(3);

    const entities = [
      new ClipboardTextKillRingEntity("foo"),
      new ClipboardTextKillRingEntity("bar"),
      new ClipboardTextKillRingEntity("baz"),
      new ClipboardTextKillRingEntity("qux"),
    ];

    entities.forEach((entity) => {
      killRing.push(entity);
    });

    assert.strictEqual(killRing.getTop()?.asString(), "qux"); // Equivalent to yank
    assert.strictEqual(killRing.pop()?.asString(), "baz"); // Equivalent to yankPop
    assert.strictEqual(killRing.pop()?.asString(), "bar");
    assert.strictEqual(killRing.pop()?.asString(), "qux");
    assert.strictEqual(killRing.pop()?.asString(), "baz");
    assert.strictEqual(killRing.pop()?.asString(), "bar");
  });

  test("less data than max", () => {
    const killRing = new KillRing(4);

    const entities = [
      new ClipboardTextKillRingEntity("foo"),
      new ClipboardTextKillRingEntity("bar"),
      new ClipboardTextKillRingEntity("baz"),
    ];

    entities.forEach((entity) => {
      killRing.push(entity);
    });

    assert.strictEqual(killRing.getTop()?.asString(), "baz");
    assert.strictEqual(killRing.pop()?.asString(), "bar");
    assert.strictEqual(killRing.pop()?.asString(), "foo");
    assert.strictEqual(killRing.pop()?.asString(), "baz");
    assert.strictEqual(killRing.pop()?.asString(), "bar");
    assert.strictEqual(killRing.pop()?.asString(), "foo");
  });

  test("just single data", () => {
    const killRing = new KillRing(3);

    const entities = [new ClipboardTextKillRingEntity("foo")];

    entities.forEach((entity) => {
      killRing.push(entity);
    });

    assert.strictEqual(killRing.getTop()?.asString(), "foo");
    assert.strictEqual(killRing.pop()?.asString(), "foo");
    assert.strictEqual(killRing.pop()?.asString(), "foo");
  });

  test("zero data", () => {
    const killRing = new KillRing(3);

    assert.strictEqual(killRing.getTop(), undefined);
    assert.strictEqual(killRing.pop(), undefined);
    assert.strictEqual(killRing.pop(), undefined);
  });

  test("pop", () => {
    const killRing = new KillRing(3);
    const entities = [
      new ClipboardTextKillRingEntity("0"),
      new ClipboardTextKillRingEntity("1"),
      new ClipboardTextKillRingEntity("2"),
    ];

    entities.forEach((entity) => {
      killRing.push(entity);
    });
    assert.strictEqual(killRing.getTop()?.asString(), "2");

    assert.strictEqual(killRing.pop(1)?.asString(), "1");
    assert.strictEqual(killRing.getTop()?.asString(), "1");

    assert.strictEqual(killRing.pop(1)?.asString(), "0");
    assert.strictEqual(killRing.getTop()?.asString(), "0");

    assert.strictEqual(killRing.pop(1)?.asString(), "2");
    assert.strictEqual(killRing.getTop()?.asString(), "2");

    assert.strictEqual(killRing.pop(-1)?.asString(), "0");
    assert.strictEqual(killRing.getTop()?.asString(), "0");

    assert.strictEqual(killRing.pop(-1)?.asString(), "1");
    assert.strictEqual(killRing.getTop()?.asString(), "1");

    assert.strictEqual(killRing.pop(-1)?.asString(), "2");
    assert.strictEqual(killRing.getTop()?.asString(), "2");

    assert.strictEqual(killRing.pop(0)?.asString(), "2");
    assert.strictEqual(killRing.getTop()?.asString(), "2");

    // Large numbers
    assert.strictEqual(killRing.pop(10)?.asString(), "1");
    assert.strictEqual(killRing.getTop()?.asString(), "1");

    assert.strictEqual(killRing.pop(-10)?.asString(), "2");
    assert.strictEqual(killRing.getTop()?.asString(), "2");
  });
});
