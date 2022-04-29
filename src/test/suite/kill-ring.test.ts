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
    assert.strictEqual(killRing.popNext()?.asString(), "baz"); // Equivalent to yankPop
    assert.strictEqual(killRing.popNext()?.asString(), "bar");
    assert.strictEqual(killRing.popNext()?.asString(), "qux");
    assert.strictEqual(killRing.popNext()?.asString(), "baz");
    assert.strictEqual(killRing.popNext()?.asString(), "bar");
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
    assert.strictEqual(killRing.popNext()?.asString(), "bar");
    assert.strictEqual(killRing.popNext()?.asString(), "foo");
    assert.strictEqual(killRing.popNext()?.asString(), "baz");
    assert.strictEqual(killRing.popNext()?.asString(), "bar");
    assert.strictEqual(killRing.popNext()?.asString(), "foo");
  });

  test("just single data", () => {
    const killRing = new KillRing(3);

    const entities = [new ClipboardTextKillRingEntity("foo")];

    entities.forEach((entity) => {
      killRing.push(entity);
    });

    assert.strictEqual(killRing.getTop()?.asString(), "foo");
    assert.strictEqual(killRing.popNext()?.asString(), "foo");
    assert.strictEqual(killRing.popNext()?.asString(), "foo");
  });

  test("zero data", () => {
    const killRing = new KillRing(3);

    assert.strictEqual(killRing.getTop(), undefined);
    assert.strictEqual(killRing.popNext(), undefined);
    assert.strictEqual(killRing.popNext(), undefined);
  });
});
