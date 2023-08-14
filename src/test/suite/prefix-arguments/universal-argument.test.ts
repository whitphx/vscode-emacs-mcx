import assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { assertCursorsEqual, assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace } from "../utils";

suite("Universal argument (C-u)", () => {
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
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(2);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "aa");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("repeating character input for the given argument 0", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(0);
      assertPrefixArgumentContext(0);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("repeating character input for the given argument prefixed by 0", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(0);
      assertPrefixArgumentContext(0);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(2);

      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "aa");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("repeating character input for the given argument with multiple digits", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(1);
      assertPrefixArgumentContext(1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(12);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "aaaaaaaaaaaa");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("repeating character input with default argument (4)", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "aaaa");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    [2, 3].forEach((times) => {
      test(`repeating character input with ${times} C-u`, async () => {
        resetExecuteCommandSpy();
        for (let i = 0; i < times; ++i) {
          await emulator.universalArgument();
        }
        assertAcceptingArgumentContext(true);
        assertPrefixArgumentContext(4 ** times);

        resetExecuteCommandSpy();
        await emulator.typeChar("a");
        assertTextEqual(activeTextEditor, "a".repeat(4 ** times));
        assertAcceptingArgumentContext(false);
        assertPrefixArgumentContext(undefined);
      });
    });

    test("C-u stops prefix argument input", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      assertPrefixArgumentContext(4);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(1);
      assertPrefixArgumentContext(1);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(2);
      assertPrefixArgumentContext(12);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(false);

      await emulator.typeChar("3");
      assertTextEqual(activeTextEditor, "333333333333");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });

    test("numerical input cancels previous repeated C-u", async () => {
      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      await emulator.universalArgument();

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertPrefixArgumentContext(64);

      resetExecuteCommandSpy();
      await emulator.subsequentArgumentDigit(3);
      assertPrefixArgumentContext(3);

      resetExecuteCommandSpy();
      await emulator.typeChar("a");
      assertTextEqual(activeTextEditor, "aaa");
      assertAcceptingArgumentContext(false);
      assertPrefixArgumentContext(undefined);
    });
  });

  suite("repeating EmacsEmulator's command (cursorMove (forwardChar)) with prefix command", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("abcdefghijklmnopqrst\nabcdefghijklmnopqrst");
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("repeating cursorMove for the given argument", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(3);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 3]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("repeating cursorMove for the given argument 0", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(0);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 0]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 1]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("repeating cursorMove for the given argument prefixed by 0", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(0);
      await emulator.subsequentArgumentDigit(3);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 3]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("repeating cursorMove for the given argument with multiple digits", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(1);
      await emulator.subsequentArgumentDigit(2);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 12]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 13]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("repeating cursorMove for the default argument (4)", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 4]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 5]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("repeating character input with double C-u", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument();
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 16]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 17]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("C-u stops prefix argument input", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      assertAcceptingArgumentContext(true);
      await emulator.subsequentArgumentDigit(1);
      await emulator.subsequentArgumentDigit(2);
      await emulator.universalArgument();
      assertAcceptingArgumentContext(false);

      resetExecuteCommandSpy();
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 12]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 13]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("numerical input cancels previous repeated C-u", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(3);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 3]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 4]); // The command normaly worked since it has exited from universal argument mode.
    });

    test("multicursor with given argument", async () => {
      setEmptyCursors(activeTextEditor, [0, 0], [1, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.subsequentArgumentDigit(3);
      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [0, 3], [1, 3]);
      assertPrefixArgumentContext(undefined);

      await emulator.runCommand("forwardChar");
      assertCursorsEqual(activeTextEditor, [0, 4], [1, 4]); // The command normaly worked since it has exited from universal argument mode.
    });
  });

  suite("with forwardChar in multi-line text", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("aaa\n".repeat(8));
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cursor moves over lines", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument(); // C-u * 2 makes 16 character movements

      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [4, 0]);
    });

    test("cursor moves at most to the end of the text", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument();
      await emulator.universalArgument(); // C-u * 3 makes 64 character movements

      await emulator.runCommand("forwardChar");

      assertCursorsEqual(activeTextEditor, [8, 0]);
    });
  });

  suite("with backwardChar in multi-line text", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace("aaa\n".repeat(8));
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("cursor moves over lines", async () => {
      setEmptyCursors(activeTextEditor, [8, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument(); // C-u * 2 makes 16 character movements

      await emulator.runCommand("backwardChar");

      assertCursorsEqual(activeTextEditor, [4, 0]);
    });

    test("cursor moves at most to the beginning of the text", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      resetExecuteCommandSpy();
      await emulator.universalArgument();
      await emulator.universalArgument();
      await emulator.universalArgument(); // C-u * 3 makes 64 character movements

      await emulator.runCommand("backwardChar");

      assertCursorsEqual(activeTextEditor, [0, 0]);
    });
  });
});
