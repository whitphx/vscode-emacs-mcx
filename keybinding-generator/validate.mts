import { KeyBinding } from "./generate-keybindings.mjs";
import { evaluateSimpleBooleanExpression } from "./simple-eval-bool.mjs";

/**
 * Evaluates a `when` condition string with the provided context **in a very rough way**.
 */
function evaluateWhenCondition(when: string, context: Record<string, boolean>, defaultValue: boolean): boolean {
  console.debug(`Evaluating when condition "${when}"`);
  let replacedWhen = when;
  for (const cond of Object.keys(context)) {
    // Replace `cond` with `true` in the when condition.
    replacedWhen = replacedWhen.replace(new RegExp(`\\b${cond}\\b`, "g"), context[cond] ? "true" : "false");
  }
  console.debug(`when condition whose values were replaced with specified boolean values: "${replacedWhen}"`);
  // Replace remaining conditions with the default value.
  replacedWhen = replacedWhen.replace(/[a-zA-Z-.]+/g, (match) => {
    if (match === "true" || match === "false") {
      return match; // Keep true/false as is.
    }
    return defaultValue ? "true" : "false"; // Replace other conditions with the default value.
  });
  console.debug(`when condition whose values were fully replaced with boolean values: ${replacedWhen}`);

  const result = evaluateSimpleBooleanExpression(replacedWhen);
  if (typeof result !== "boolean") {
    throw new Error(`When condition "${when}" does not evaluate to boolean.`);
  }

  return result;
}

function ctrlEditsInFindWidgetOnWindowsOrLinux(keybindings: KeyBinding[]): string[] {
  const errors: string[] = [];

  // Keybindings that we want to use in the find widget on Windows/Linux
  // without being overridden by this extension's keybindings.
  // For example, `ctrl+v` must be left unbound so the user has at least one way to paste in the find widget.
  const ctrlEditKeybindings = ["ctrl+z", "ctrl+x", "ctrl+c", "ctrl+v"];

  keybindings.forEach((binding) => {
    if (!ctrlEditKeybindings.some((k) => k === binding.key)) {
      return;
    }
    if (binding.when == null) {
      // Unconditionally active.
      errors.push(
        `Keybinding "${binding.key}" on Windows/Linux is activated unconditionally, which may lead to conflicts with edit/move keybindings in find widget.`,
      );
      return;
    }

    const context = {
      isMac: false,
      isWindows: false,
      isLinux: false,
      editorTextFocus: true,
      editorReadonly: false,
      suggestWidgetVisible: false,
      terminalFocus: false,
      findWidgetVisible: true,
      findInputFocussed: true,
      replaceInputFocussed: false,
      isComposing: false,
    };
    const when = binding.when;

    [true, false].forEach((isWindows) => {
      const isMatched = evaluateWhenCondition(
        when,
        {
          ...context,
          isWindows,
          isLinux: !isWindows,
        },
        true,
      );
      if (isMatched) {
        errors.push(
          `Keybinding "${binding.key}" on ${isWindows ? "Windows" : "Linux"} is activated in find widget, which may leads to conflicting with edit/move keybindings in find widget.`,
        );
        return;
      }
    });
  });
  return errors;
}

function cmdEditsInFindWidgetOnMac(keybindings: KeyBinding[]): string[] {
  const errors: string[] = [];

  // Keybindings that we want to use in the find widget on Mac
  // without being overridden by this extension's keybindings.
  // For example, `cmd+v` must be left unbound so the user has at least one way to paste in the find widget.
  // Ref: https://github.com/whitphx/vscode-emacs-mcx/issues/2042#issuecomment-2530005366
  const macCmdEditKeybindings = ["cmd+z", "cmd+x", "cmd+c", "cmd+v"];

  keybindings.forEach((binding) => {
    const macKey = binding.mac ?? binding.key;
    if (!macCmdEditKeybindings.some((k) => k === macKey)) {
      return;
    }
    if (binding.when == null) {
      // Unconditionally active.
      errors.push(
        `Keybinding "${macKey}" on Mac is activated unconditionally, which may leads to conflicting with edit/move keybindings in find widget.`,
      );
      return;
    }

    const context = {
      isMac: true,
      isWindows: false,
      isLinux: false,
      editorTextFocus: true,
      editorReadonly: false,
      suggestWidgetVisible: false,
      terminalFocus: false,
      findWidgetVisible: true,
      findInputFocussed: true,
      replaceInputFocussed: false,
      isComposing: false,
    };
    const when = binding.when;

    // Check both cases: with and without `useMetaPrefixMacCmd`.
    [true, false].forEach((useMetaPrefixMacCmd) => {
      const isMatched = evaluateWhenCondition(
        when,
        {
          ...context,
          "config.emacs-mcx.useMetaPrefixMacCmd": useMetaPrefixMacCmd,
        },
        true,
      );
      if (isMatched) {
        errors.push(
          `Keybinding "${macKey}" on Mac is activated in find widget, which may leads to conflicting with edit/move keybindings in find widget.`,
        );
        return;
      }
    });
  });
  return errors;
}

function ctrlXOnTerminal(keybindings: KeyBinding[]): string[] {
  // Keybindings starting with `ctrl+x` on Terminal should not be defined because
  // it causes VSCode to interrupt the `ctrl+x` sequence and wait for the next key,
  // which makes a single `ctrl+x` not to be sent to the terminal and it's not what we want.
  const errors: string[] = [];

  keybindings.forEach((binding) => {
    if (binding.key == null) {
      return;
    }
    if (!binding.key.startsWith("ctrl+x")) {
      return;
    }
    if (binding.when == null) {
      // Unconditionally active.
      errors.push(
        `Keybinding "${JSON.stringify(binding)}" starting with "ctrl+x" is activated unconditionally, which may lead to conflicts with terminal input.`,
      );
      return;
    }

    const context = {
      isMac: false,
      isWindows: false,
      isLinux: false,
      editorTextFocus: false,
      editorReadonly: false,
      suggestWidgetVisible: false,
      terminalFocus: true,
      findWidgetVisible: false,
      findInputFocussed: false,
      replaceInputFocussed: false,
      isComposing: false,
    };
    const when = binding.when;

    const isMatched = evaluateWhenCondition(when, context, true);
    if (isMatched) {
      errors.push(
        `Keybinding "${JSON.stringify(binding)}" starting with "ctrl+x" is activated in terminal, which may leads to conflicting with terminal input.`,
      );
      return;
    }
  });
  return errors;
}

/**
 * Validates the generated keybindings.
 * Throws an error if any potential issues are found.
 */

export function validate(keybindings: KeyBinding[]) {
  // NOTE: This validation process is not perfect.
  // We define ad-hoc rules to detect potential issues in keybindings.
  // We haven't paid so much care about reducing false positives,
  // focusing on detecting possible issues.

  const errors: string[] = [];
  errors.push(...ctrlEditsInFindWidgetOnWindowsOrLinux(keybindings));
  errors.push(...cmdEditsInFindWidgetOnMac(keybindings));
  errors.push(...ctrlXOnTerminal(keybindings));

  if (errors.length > 0) {
    throw new Error("Keybinding validation failed:\n" + errors.join("\n"));
  }
}
