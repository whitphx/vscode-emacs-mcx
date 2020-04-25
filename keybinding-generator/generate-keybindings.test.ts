import * as expect from "expect";
import { generateKeybindings, KeyBindingSource, KeyBinding } from "./generate-keybindings";

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
        when: "editorTextFocus",
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
        key: "alt+j",
        command: "emacs-mcx.forwardWord",
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
      },
      {
        mac: "cmd+f cmd+f",
        command: "emacs-mcx.forwardWord",
        when: "config.emacs-mcx.useMetaPrefixMacCmd",
      },
    ];
    expect(generateKeybindings(src)).toEqual(expected);
  });
});
