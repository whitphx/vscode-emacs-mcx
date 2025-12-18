import assert from "assert";
import {
  generateKeybindings,
  isValidKey,
  replaceMetaWithEscape,
  KeyBindingSource,
  KeyBinding,
} from "./generate-keybindings.mjs";

describe("generateKeybindings", () => {
  it("converts src including 'keys'", () => {
    const src: KeyBindingSource = {
      keys: ["right", "ctrl+f"],
      command: "emacs-mcx.forwardChar",
      when: "editorTextFocus",
    };
    const expected: KeyBinding[] = [
      {
        key: "right",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
      },
      {
        key: "ctrl+f",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with meta key not including 'when'", () => {
    const src: KeyBindingSource = {
      key: "meta+f",
      command: "emacs-mcx.forwardWord",
    };
    const expected: KeyBinding[] = [
      {
        key: "alt+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixAlt",
      },
      {
        mac: "cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixEscape",
      },
      {
        key: "ctrl+[ f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixCtrlLeftBracket",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with meta key including 'when'", () => {
    const src: KeyBindingSource = {
      key: "meta+f",
      command: "emacs-mcx.forwardWord",
      when: "editorTextFocus",
    };
    const expected: KeyBinding[] = [
      {
        key: "alt+f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixAlt",
      },
      {
        mac: "cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixEscape",
      },
      {
        key: "ctrl+[ f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixCtrlLeftBracket",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with meta key not including multiple 'keys'", () => {
    const src: KeyBindingSource = {
      keys: ["meta+f", "meta+j"],
      command: "emacs-mcx.forwardWord",
    };
    const expected: KeyBinding[] = [
      {
        key: "alt+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixAlt",
      },
      {
        mac: "cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixEscape",
      },
      {
        key: "ctrl+[ f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixCtrlLeftBracket",
      },
      {
        key: "alt+j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixAlt",
      },
      {
        mac: "cmd+j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixEscape",
      },
      {
        key: "ctrl+[ j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixCtrlLeftBracket",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with meta key with multiple key strokes", () => {
    const src: KeyBindingSource = {
      key: "meta+f meta+f",
      command: "emacs-mcx.forwardWord",
    };
    const expected: KeyBinding[] = [
      {
        key: "alt+f alt+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixAlt",
      },
      {
        mac: "cmd+f cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src including 'whens'", () => {
    const src: KeyBindingSource = {
      keys: ["right", "ctrl+f"],
      command: "emacs-mcx.forwardChar",
      whens: ["editorTextFocus", "terminalFocus"],
    };
    const expected: KeyBinding[] = [
      {
        key: "right",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
      },
      {
        key: "ctrl+f",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
      },
      {
        key: "right",
        command: "emacs-mcx.forwardChar",
        when: "terminalFocus",
      },
      {
        key: "ctrl+f",
        command: "emacs-mcx.forwardChar",
        when: "terminalFocus",
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with shiftVariants", () => {
    const src: KeyBindingSource = {
      keys: ["ctrl+d", "ctrl+f"],
      command: "emacs-mcx.forwardChar",
      when: "editorTextFocus",
      args: { repeat: 2 },
      shiftVariants: true,
    };
    const expected: KeyBinding[] = [
      {
        key: "ctrl+d",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
        args: { repeat: 2 },
      },
      {
        key: "ctrl+f",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus",
        args: { repeat: 2 },
      },
      {
        key: "shift+ctrl+d",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus && config.emacs-mcx.shiftSelectMode",
        args: { repeat: 2, shift: true },
      },
      {
        key: "shift+ctrl+f",
        command: "emacs-mcx.forwardChar",
        when: "editorTextFocus && config.emacs-mcx.shiftSelectMode",
        args: { repeat: 2, shift: true },
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });

  it("converts src with shiftVariants and isearchInterruptible", () => {
    const src: KeyBindingSource = {
      key: "ctrl+n",
      command: "emacs-mcx.nextLine",
      when: "editorTextFocus",
      args: { repeat: 3 },
      shiftVariants: true,
      isearchInterruptible: true,
    };
    const expected: KeyBinding[] = [
      {
        key: "ctrl+n",
        command: "emacs-mcx.nextLine",
        when: "editorTextFocus",
        args: { repeat: 3 },
      },
      {
        key: "ctrl+n",
        command: "emacs-mcx.isearchExit",
        when: "!config.emacs-mcx.cursorMoveOnFindWidget && editorFocus && findWidgetVisible && !replaceInputFocussed && !isComposing",
        args: { then: { command: "emacs-mcx.nextLine", args: { repeat: 3 } } },
      },
      {
        key: "shift+ctrl+n",
        command: "emacs-mcx.nextLine",
        when: "editorTextFocus && config.emacs-mcx.shiftSelectMode",
        args: { repeat: 3, shift: true },
      },
      {
        key: "shift+ctrl+n",
        command: "emacs-mcx.isearchExit",
        when: "!config.emacs-mcx.cursorMoveOnFindWidget && editorFocus && findWidgetVisible && !replaceInputFocussed && !isComposing && config.emacs-mcx.shiftSelectMode",
        args: { then: { command: "emacs-mcx.nextLine", args: { repeat: 3, shift: true } } },
      },
    ];
    assert.deepStrictEqual(generateKeybindings(src), expected);
  });
});

describe("isValidKey", () => {
  const testcases: { key: string; expected: boolean }[] = [
    { key: "", expected: false },
    { key: " ", expected: false },
    { key: "ctrl+f", expected: true },
    { key: "ctrl +f", expected: false },
    { key: "ctrl+ f", expected: false },
    { key: "ctrl + f", expected: false },
    { key: "ctrl+x f", expected: true },
    { key: "meta+shift+[", expected: true },
  ];
  testcases.forEach(({ key, expected }) => {
    it(`returns ${expected} given "${key}"`, () => {
      assert.deepStrictEqual(isValidKey(key), expected);
    });
  });
});

describe("replaceMetaWithEscape", () => {
  const testcases: { key: string; expected: string }[] = [
    { key: "ctrl+f", expected: "ctrl+f" },
    { key: "meta+f", expected: "escape f" },
    { key: "ctrl+meta+f", expected: "escape ctrl+f" },
  ];
  testcases.forEach(({ key, expected }) => {
    it(`returns ${expected} given "${key}"`, () => {
      if (!isValidKey(key)) {
        throw new Error("Invalid key");
      }
      assert.deepStrictEqual(replaceMetaWithEscape(key), expected);
    });
  });
});
