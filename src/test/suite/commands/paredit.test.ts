import assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { Selection, TextEditor } from "vscode";
import { EmacsEmulator } from "../../../emulator";
import { KillRing } from "../../../kill-yank/kill-ring";
import {
  setEmptyCursors,
  setupWorkspace,
  cleanUpWorkspace,
  assertCursorsEqual,
  assertTextEqual,
  clearTextEditor,
  assertSelectionsEqual,
} from "../utils";
import { Configuration } from "../../../configuration/configuration";

suite("paredit commands", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(a b)";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  suite("forwardSexp", () => {
    test("without mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      await emulator.runCommand("paredit.forwardSexp");

      assertSelectionsEqual(activeTextEditor, new Selection(0, 5, 0, 5));
    });

    test("with mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 0]);

      emulator.setMarkCommand();
      await emulator.runCommand("paredit.forwardSexp");

      assertSelectionsEqual(activeTextEditor, new Selection(0, 0, 0, 5));
    });
  });

  suite("backwardSexp", () => {
    test("without mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]);

      await emulator.runCommand("paredit.backwardSexp");

      assertSelectionsEqual(activeTextEditor, new Selection(0, 0, 0, 0));
    });

    test("with mark-mode", async () => {
      setEmptyCursors(activeTextEditor, [0, 5]);

      emulator.setMarkCommand();
      await emulator.runCommand("paredit.backwardSexp");

      assertSelectionsEqual(activeTextEditor, new Selection(0, 5, 0, 0));
    });
  });
});

suite("Parentheses config", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;
  let getConfigurationStub: sinon.SinonStub;

  setup(async () => {
    const initialText = "<<>>";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);

    getConfigurationStub = sinon.stub(vscode.workspace, "getConfiguration");
  });
  teardown(async () => {
    getConfigurationStub.restore();
    Configuration.reload();
    await cleanUpWorkspace();
  });

  function mockPareditConfig(parentheses: Record<string, string>) {
    getConfigurationStub.returns({
      paredit: {
        parentheses,
      },
    });
    Configuration.reload();
  }

  test("forwardSexp", async () => {
    mockPareditConfig({ "(": ")" });
    setEmptyCursors(activeTextEditor, [0, 1]);
    await emulator.runCommand("paredit.forwardSexp");
    assertCursorsEqual(activeTextEditor, [0, 4]);
    await emulator.runCommand("paredit.forwardSexp");
    assertCursorsEqual(activeTextEditor, [0, 4]);

    mockPareditConfig({ "<": ">" });
    setEmptyCursors(activeTextEditor, [0, 1]);
    await emulator.runCommand("paredit.forwardSexp");
    assertCursorsEqual(activeTextEditor, [0, 3]);
    await emulator.runCommand("paredit.forwardSexp");
    assertCursorsEqual(activeTextEditor, [0, 3]);
  });
});

suite("paredit.kill-sexp", () => {
  const initialText = `(
  (
    a b
  )
  (
    c d
  )
)`;
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("killing outer parentheses", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("paredit.killSexp");

    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(activeTextEditor, initialText);
  });

  test("killing inner parentheses continuously", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.runCommand("paredit.killSexp");

    assertTextEqual(
      activeTextEditor,
      `(

  (
    c d
  )
)`,
    );
    assertCursorsEqual(activeTextEditor, [1, 0]);

    await emulator.runCommand("paredit.killSexp");

    assertTextEqual(
      activeTextEditor,
      `(

)`,
    );
    assertCursorsEqual(activeTextEditor, [1, 0]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(
      activeTextEditor,
      `  (
    a b
  )
  (
    c d
  )`,
    );
  });

  test("killing inner parentheses with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);

    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.killSexp");

    assertTextEqual(
      activeTextEditor,
      `(

)`,
    );
    assertCursorsEqual(activeTextEditor, [1, 0]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(
      activeTextEditor,
      `  (
    a b
  )
  (
    c d
  )`,
    );
  });
});

suite("paredit.backward-kill-sexp", () => {
  const initialText = `(
  (
    a b
  )
  (
    c d
  )
)`;
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("killing outer parentheses", async () => {
    setEmptyCursors(activeTextEditor, [7, 1]);

    await emulator.runCommand("paredit.backwardKillSexp");

    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(activeTextEditor, initialText);
  });

  test("killing inner parentheses continuously", async () => {
    setEmptyCursors(activeTextEditor, [6, 3]);

    await emulator.runCommand("paredit.backwardKillSexp");

    assertTextEqual(
      activeTextEditor,
      `(
  (
    a b
  )
  
)`,
    );
    assertCursorsEqual(activeTextEditor, [4, 2]);

    await emulator.runCommand("paredit.backwardKillSexp");

    assertTextEqual(
      activeTextEditor,
      `(
  
)`,
    );
    assertCursorsEqual(activeTextEditor, [1, 2]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(
      activeTextEditor,
      `(
    a b
  )
  (
    c d
  )`,
    );
  });

  test("killing inner parentheses with prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [6, 3]);

    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.backwardKillSexp");

    assertTextEqual(
      activeTextEditor,
      `(
  
)`,
    );
    assertCursorsEqual(activeTextEditor, [1, 2]);

    await clearTextEditor(activeTextEditor);

    await emulator.runCommand("yank");

    assertTextEqual(
      activeTextEditor,
      `(
    a b
  )
  (
    c d
  )`,
    );
  });
});

suite("paredit.paredit-kill kill to end-of-line", () => {
  // https://github.com/emacsmirror/paredit/blob/d0b1a2f42fb47efc8392763d6487fd027e3a2955/paredit.el#L353
  // ("(foo bar)|     ; Useless comment!"
  // "(foo bar)|")
  const initialText = "(foo bar)     ; Useless comment!";
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("kill to end-of-line", async () => {
    setEmptyCursors(activeTextEditor, [0, 9]);

    await emulator.runCommand("paredit.pareditKill");

    assertTextEqual(activeTextEditor, "(foo bar)");
    assertCursorsEqual(activeTextEditor, [0, 9]);

    await clearTextEditor(activeTextEditor);

    // TODO
    // await emulator.runCommand("yank");
    // assertTextEqual(activeTextEditor, initialText);
  });
});

suite("paredit.paredit-kill kill inside sexp", () => {
  // https://github.com/emacsmirror/paredit/blob/d0b1a2f42fb47efc8392763d6487fd027e3a2955/paredit.el#L353
  // ("(|foo bar)     ; Useful comment!"
  // "(|)     ; Useful comment!")
  const initialText = "(foo bar)     ; Useful comment!";
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("kill inside sexp", async () => {
    setEmptyCursors(activeTextEditor, [0, 1]);

    await emulator.runCommand("paredit.pareditKill");

    assertTextEqual(activeTextEditor, "()     ; Useful comment!");
    assertCursorsEqual(activeTextEditor, [0, 1]);

    await clearTextEditor(activeTextEditor);

    // TODO
    // await emulator.runCommand("yank");
    // assertTextEqual(activeTextEditor, initialText);
  });
});

suite("paredit.paredit-kill kill entire line", () => {
  // https://github.com/emacsmirror/paredit/blob/d0b1a2f42fb47efc8392763d6487fd027e3a2955/paredit.el#L353
  // ("|(foo bar)     ; Useless line!"
  // "|")
  const initialText = "(foo bar)     ; Useless line!";
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("kill entire line", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("paredit.pareditKill");

    assertTextEqual(activeTextEditor, "");
    assertCursorsEqual(activeTextEditor, [0, 0]);

    await clearTextEditor(activeTextEditor);

    // TODO
    // await emulator.runCommand("yank");
    // assertTextEqual(activeTextEditor, initialText);
  });
});

suite("paredit.paredit-kill kill inside string", () => {
  // https://github.com/emacsmirror/paredit/blob/d0b1a2f42fb47efc8392763d6487fd027e3a2955/paredit.el#L353
  // ("(foo \"|bar baz\"\n     quux)"
  // "(foo \"|\"\n     quux)"))
  const initialText = `(foo "bar baz"
     quux)`;
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("kill inside string", async () => {
    setEmptyCursors(activeTextEditor, [0, 6]);

    await emulator.runCommand("paredit.pareditKill");

    assertTextEqual(
      activeTextEditor,
      `(foo ""
     quux)`,
    );
    assertCursorsEqual(activeTextEditor, [0, 6]);

    await clearTextEditor(activeTextEditor);

    // TODO
    // await emulator.runCommand("yank");
    // assertTextEqual(activeTextEditor, initialText);
  });
});

suite("paredit.mark-sexp", () => {
  const initialText = `(
  (
    a b
  )
  (
    c d
  )
)`;
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace(initialText);
    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);
  });

  teardown(cleanUpWorkspace);

  test("set mark at the outer parentheses", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("paredit.markSexp");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, new Selection(0, 0, 7, 1));
    assert.ok(emulator.isInMarkMode);

    emulator.exitMarkMode();
    activeTextEditor.selection = new Selection(0, 0, 0, 0);
    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [7, 1]);
  });

  test("mark inner parentheses continuously", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);
    emulator.pushMark(activeTextEditor.selections.map((s) => s.active));

    await emulator.runCommand("paredit.markSexp");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, new Selection(1, 0, 3, 3));

    await emulator.runCommand("paredit.markSexp");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, new Selection(1, 0, 6, 3));

    emulator.exitMarkMode();
    activeTextEditor.selection = new Selection(0, 0, 0, 0);

    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [6, 3]);
    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [1, 0]);
  });

  test("mark inner parentheses with a positive prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [1, 0]);
    emulator.pushMark(activeTextEditor.selections.map((s) => s.active));

    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.markSexp");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, new Selection(1, 0, 6, 3));

    emulator.exitMarkMode();
    activeTextEditor.selection = new Selection(0, 0, 0, 0);

    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [6, 3]);
    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [1, 0]);
  });

  test("mark inner parentheses with a negative prefix argument", async () => {
    setEmptyCursors(activeTextEditor, [6, 3]);
    emulator.pushMark(activeTextEditor.selections.map((s) => s.active));

    await emulator.negativeArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.markSexp");

    assertTextEqual(activeTextEditor, initialText);
    assertSelectionsEqual(activeTextEditor, new Selection(6, 3, 1, 2));

    emulator.exitMarkMode();
    activeTextEditor.selection = new Selection(0, 0, 0, 0);

    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [1, 2]);
    emulator.popMark();
    assertCursorsEqual(activeTextEditor, [6, 3]);
  });
});

suite("paredit commands with a long text that requires revealing", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(" + "\n".repeat(1000) + ")";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("forwardSexp: the selection is revealed at the active cursor", async () => {
    setEmptyCursors(activeTextEditor, [0, 0]);
    emulator.setMarkCommand();

    await emulator.runCommand("paredit.forwardSexp");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    assert.strictEqual(activeTextEditor.selections.length, 1);
    assert.strictEqual(activeTextEditor.selection.active.line, 1000);
    assert.strictEqual(activeTextEditor.visibleRanges[0]?.end.line, 1000);
  });

  test("backwardSexp: the selection is revealed at the active cursor", async () => {
    setEmptyCursors(activeTextEditor, [1000, 1]);
    emulator.setMarkCommand();

    await emulator.runCommand("paredit.backwardSexp");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    assert.strictEqual(activeTextEditor.selections.length, 1);
    assert.strictEqual(activeTextEditor.selection.active.line, 0);
    assert.strictEqual(activeTextEditor.visibleRanges[0]?.start.line, 0);
  });
});

suite("paredit commands with prefix argument", () => {
  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    const initialText = "(0 1 2 3 4 5 6 7 8 9)";

    activeTextEditor = await setupWorkspace(initialText);
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(cleanUpWorkspace);

  test("forwardSexp", async () => {
    setEmptyCursors(activeTextEditor, [0, 2]); // the right to `0`

    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.forwardSexp");

    assertSelectionsEqual(activeTextEditor, new Selection(0, 6, 0, 6));
  });

  test("backwardSexp", async () => {
    setEmptyCursors(activeTextEditor, [0, 19]); // the left to `9`

    await emulator.universalArgument();
    await emulator.subsequentArgumentDigit(2);
    await emulator.runCommand("paredit.backwardSexp");

    assertSelectionsEqual(activeTextEditor, new Selection(0, 15, 0, 15));
  });
});

suite("with semicolon", () => {
  const initialText = "(a ; b)\n(a ; b)\n(a ; b)";

  let activeTextEditor: TextEditor;
  let emulator: EmacsEmulator;

  suite("with lisp (clojure)", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, {
        language: "clojure",
      });
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    test("semicolon is treated as comment", async () => {
      setEmptyCursors(activeTextEditor, [0, 2]);

      await emulator.runCommand("paredit.forwardSexp");

      // The cursor is at the beginning of the next line
      assertSelectionsEqual(activeTextEditor, new Selection(1, 0, 1, 0));
    });
  });

  suite("with other than lisp", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace(initialText, {
        language: "csharp",
      });
      emulator = new EmacsEmulator(activeTextEditor);
    });

    teardown(cleanUpWorkspace);

    [0, 1, 2].forEach((line) => {
      test(`semicolon is treated as one entity (line ${line})`, async () => {
        setEmptyCursors(activeTextEditor, [line, 2]);

        await emulator.runCommand("paredit.forwardSexp");

        // The cursor is right to ";"
        assertSelectionsEqual(activeTextEditor, new Selection(line, 4, line, 4));
      });
    });
  });
});
