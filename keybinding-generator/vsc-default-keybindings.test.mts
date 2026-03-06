import assert from "assert";
import {
  getVscDefaultKeybindingWhenCondition,
  _setDefaultKeybindingsSetForTesting,
  VscKeybinding,
} from "./vsc-default-keybindings.mjs";

function setup(keybindings: { linux: VscKeybinding[]; win: VscKeybinding[]; osx: VscKeybinding[] }): void {
  _setDefaultKeybindingsSetForTesting(keybindings);
}

describe("getVscDefaultKeybindingWhenCondition", () => {
  it("throws when command is not found on any platform", () => {
    setup({ linux: [], win: [], osx: [] });
    assert.throws(
      () => getVscDefaultKeybindingWhenCondition("nonexistent.command"),
      /Command "nonexistent.command" not found in VSCode default keybindings/,
    );
  });

  it("returns the when condition for a command present on all platforms", () => {
    const binding: VscKeybinding = { key: "ctrl+f", command: "doSomething", when: "editorTextFocus" };
    setup({ linux: [binding], win: [binding], osx: [binding] });
    assert.strictEqual(getVscDefaultKeybindingWhenCondition("doSomething"), "editorTextFocus");
  });

  it("returns undefined for a command present on all platforms without when", () => {
    const binding: VscKeybinding = { key: "ctrl+f", command: "doSomething" };
    setup({ linux: [binding], win: [binding], osx: [binding] });
    assert.strictEqual(getVscDefaultKeybindingWhenCondition("doSomething"), undefined);
  });

  it("returns platform-specific conditions when one platform has no when (unconditional)", () => {
    // Linux has the command unconditionally, OSX has it with a condition, Windows missing.
    // Linux should contribute just "isLinux", while others get their condition + platform guard.
    setup({
      linux: [{ key: "ctrl+f", command: "doSomething" }],
      win: [],
      osx: [{ key: "ctrl+f", command: "doSomething", when: "editorTextFocus" }],
    });
    assert.strictEqual(
      getVscDefaultKeybindingWhenCondition("doSomething"),
      "(isLinux) || (editorTextFocus && isMac) || (editorTextFocus && isWindows)",
    );
  });

  it("returns platform-specific OR conditions when platforms have different when conditions", () => {
    setup({
      linux: [{ key: "ctrl+f", command: "doSomething", when: "condA" }],
      win: [{ key: "ctrl+f", command: "doSomething", when: "condA" }],
      osx: [{ key: "ctrl+f", command: "doSomething", when: "condB" }],
    });
    assert.strictEqual(
      getVscDefaultKeybindingWhenCondition("doSomething"),
      "(condA && isLinux) || (condB && isMac) || (condA && isWindows)",
    );
  });

  it("uses fallback when for platforms missing the command", () => {
    // Only on OSX with a when condition. Missing platforms inherit the OSX condition.
    setup({
      linux: [],
      win: [],
      osx: [{ key: "ctrl+f", command: "doSomething", when: "inQuickOpen" }],
    });
    assert.strictEqual(getVscDefaultKeybindingWhenCondition("doSomething"), "inQuickOpen");
  });

  it("adds platform condition for unconditional match mixed with conditional fallback", () => {
    // OSX unconditional, Linux has a condition, Windows missing (falls back to Linux's condition).
    setup({
      linux: [{ key: "ctrl+f", command: "doSomething", when: "condA" }],
      win: [],
      osx: [{ key: "ctrl+f", command: "doSomething" }],
    });
    assert.strictEqual(
      getVscDefaultKeybindingWhenCondition("doSomething"),
      "(condA && isLinux) || (isMac) || (condA && isWindows)",
    );
  });
});
