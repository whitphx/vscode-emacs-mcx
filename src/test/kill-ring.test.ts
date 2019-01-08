import * as assert from "assert";
import { KillRing } from "../kill-ring";

suite("KillRing", () => {
    test("push, getTop, and pop", () => {
        const killRing = new KillRing(3);

        killRing.push("foo");
        killRing.push("bar");
        killRing.push("baz");
        killRing.push("qux");

        assert.equal(killRing.getTop(), "qux");  // Equivalent to yank
        assert.equal(killRing.pop(), "baz");  // Equivalent to yankPop
        assert.equal(killRing.pop(), "bar");
        assert.equal(killRing.pop(), "qux");
        assert.equal(killRing.pop(), "baz");
        assert.equal(killRing.pop(), "bar");
    });

    test("less data than max", () => {
        const killRing = new KillRing(4);

        killRing.push("foo");
        killRing.push("bar");
        killRing.push("baz");

        assert.equal(killRing.getTop(), "baz");
        assert.equal(killRing.pop(), "bar");
        assert.equal(killRing.pop(), "foo");
        assert.equal(killRing.pop(), "baz");
        assert.equal(killRing.pop(), "bar");
        assert.equal(killRing.pop(), "foo");
    });

    test("just single data", () => {
        const killRing = new KillRing(3);

        killRing.push("foo");

        assert.equal(killRing.getTop(), "foo");
        assert.equal(killRing.pop(), "foo");
        assert.equal(killRing.pop(), "foo");
    });


    test("zero data", () => {
        const killRing = new KillRing(3);

        assert.equal(killRing.getTop(), null);
        assert.equal(killRing.pop(), null);
        assert.equal(killRing.pop(), null);
    });
});
