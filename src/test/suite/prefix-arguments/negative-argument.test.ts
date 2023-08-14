import assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertTextEqual, cleanUpWorkspace, setupWorkspace } from "../utils";

suite("Negative argument (M--)", () => {
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

  suite("Negative argument and single character input", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace();
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("M-- 3", async () => {
      resetExecuteCommandSpy();
      await emulator.negativeArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(-1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(-3);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, ""); // Nothing happens
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("C-u - 3", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.typeChar("-");
      assertPrefixArgumentContext(-1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(-3);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, ""); // Nothing happens
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("C-u C-u - 3", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertPrefixArgumentContext(16);

      resetExecuteCommandSpy();
      await emulator.typeChar("-");
      assertPrefixArgumentContext(-1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(-3);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, ""); // Nothing happens
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("C-u M-- 3", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.negativeArgument();
      assertPrefixArgumentContext(-1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(-3);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, ""); // Nothing happens
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("C-u 3 - ('-' is not handled as a minus sign)", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(3);

      resetExecuteCommandSpy();
      await emulator.typeChar("-");
      assertTextEqual(activeTextEditor, "---");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });
  });
});
