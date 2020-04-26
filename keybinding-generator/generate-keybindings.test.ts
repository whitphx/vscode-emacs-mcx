import * as expect from "expect";
import {
  generateKeybindings,
  isValidKey,
  replaceMetaWithEscape,
  KeyBindingSource,
  KeyBinding,
} from "./generate-keybindings";

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
    expect(generateKeybindings(src)).toEqual(expected);
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
        when: "!config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "alt+f",
        mac: "cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixEscape",
      },
    ];
    expect(generateKeybindings(src)).toEqual(expected);
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
        when: "editorTextFocus && !config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "alt+f",
        mac: "cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape f",
        command: "emacs-mcx.forwardWord",
        when: "editorTextFocus && config.emacs-mcx.useMetaPrefixEscape",
      },
    ];
    expect(generateKeybindings(src)).toEqual(expected);
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
        when: "!config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "alt+f",
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
        key: "alt+j",
        command: "emacs-mcx.forwardWord",
        when: "!config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "alt+j",
        mac: "cmd+j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "escape j",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixEscape",
      },
    ];
    expect(generateKeybindings(src)).toEqual(expected);
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
        when: "!config.emacs-mcx.useMetaPrefixMacCmd",
      },
      {
        key: "alt+f alt+f",
        mac: "cmd+f cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
    ];
    expect(generateKeybindings(src)).toEqual(expected);
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
    expect(generateKeybindings(src)).toEqual(expected);
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
      expect(isValidKey(key)).toEqual(expected);
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
      expect(replaceMetaWithEscape(key)).toEqual(expected);
    });
  });
});
