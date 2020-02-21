import * as assert from "assert";
import { KillRing } from "../../kill-yank/kill-ring";
import { ClipboardTextKillRingEntity } from "../../kill-yank/kill-ring-entity/clipboard-text";

suite("KillRing", () => {
  test("push, getTop, and pop", () => {
    const killRing = new KillRing(3);

    const entities = [
      new ClipboardTextKillRingEntity("foo"),
      new ClipboardTextKillRingEntity("bar"),
      new ClipboardTextKillRingEntity("baz"),
      new ClipboardTextKillRingEntity("qux")
    ];

    entities.forEach(entity => {
      killRing.push(entity);
    });

    assert.equal(killRing.getTop()!.asString(), "qux"); // Equivalent to yank
    assert.equal(killRing.pop()!.asString(), "baz"); // Equivalent to yankPop
    assert.equal(killRing.pop()!.asString(), "bar");
    assert.equal(killRing.pop()!.asString(), "qux");
    assert.equal(killRing.pop()!.asString(), "baz");
    assert.equal(killRing.pop()!.asString(), "bar");
  });

  test("less data than max", () => {
    const killRing = new KillRing(4);

    const entities = [
      new ClipboardTextKillRingEntity("foo"),
      new ClipboardTextKillRingEntity("bar"),
      new ClipboardTextKillRingEntity("baz")
    ];

    entities.forEach(entity => {
      killRing.push(entity);
    });

    assert.equal(killRing.getTop()!.asString(), "baz");
    assert.equal(killRing.pop()!.asString(), "bar");
    assert.equal(killRing.pop()!.asString(), "foo");
    assert.equal(killRing.pop()!.asString(), "baz");
    assert.equal(killRing.pop()!.asString(), "bar");
    assert.equal(killRing.pop()!.asString(), "foo");
  });

  test("just single data", () => {
    const killRing = new KillRing(3);

    const entities = [new ClipboardTextKillRingEntity("foo")];

    entities.forEach(entity => {
      killRing.push(entity);
    });

    assert.equal(killRing.getTop()!.asString(), "foo");
    assert.equal(killRing.pop()!.asString(), "foo");
    assert.equal(killRing.pop()!.asString(), "foo");
  });

  test("zero data", () => {
    const killRing = new KillRing(3);

    assert.equal(killRing.getTop(), null);
    assert.equal(killRing.pop(), null);
    assert.equal(killRing.pop(), null);
  });
});
