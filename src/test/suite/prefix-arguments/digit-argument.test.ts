import assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setupWorkspace } from "../utils";

suite("Digit argument (M-<number>)", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(() => {
    sinon.spy(vscode.commands, "executeCommand");
  });

  teardown(() => {
    sinon.restore();
  });

  const assertPrefixArgumentContext = (expected: number | undefined) => {
    assert(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      vscode.commands.executeCommand.calledWithExactly("setContext", "emacs-mcx.prefixArgument", expected),
      `Assertion failed that emacs-mcx.prefixArgument context has been set to ${expected}`,
    );
  };

  const assertAcceptingArgumentContext = (expected: boolean) => {
    assert(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      vscode.commands.executeCommand.calledWithExactly("setContext", "emacs-mcx.acceptingArgument", expected),
      `Assertion failed that emacs-mcx.acceptingArgument context has been set to ${expected}`,
    );
  };

  const resetExecuteCommandSpy = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    vscode.commands.executeCommand.resetHistory();
  };

  suite("repeating single character", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace();
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("repeating character input for the given argument", async () => {
      resetExecuteCommandSpy();
      await emulator.digitArgument(3);
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(3);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(32);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "a".repeat(32));
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("repeating character input for the given argument 0", async () => {
      resetExecuteCommandSpy();
      await emulator.digitArgument(0);
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(0);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("C-u stops the digit argument inputs", async () => {
      resetExecuteCommandSpy();
      await emulator.digitArgument(3);
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(3);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(1);
      assertPrefixArgumentContext(31);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(312);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(false);

      await emulator.typeChar("3");
      assertTextEqual(activeTextEditor, "3".repeat(312));
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });
  });
});
