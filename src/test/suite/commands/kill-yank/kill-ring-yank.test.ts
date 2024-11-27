import assert from "assert";
import * as vscode from "vscode";
import { Position, Range, Selection } from "vscode";
import { moveCommandIds } from "../../../../commands/move";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import {
  assertCursorsEqual,
  assertTextEqual,
  cleanUpWorkspace,
  clearTextEditor,
  delay,
  setEmptyCursors,
  setupWorkspace,
} from "../../utils";

suite("kill, yank, yank-pop", () => {
  let activeTextEditor: vscode.TextEditor;

  suite("with empty initial text", () => {
    setup(async () => {
      activeTextEditor = await setupWorkspace();
      await vscode.env.clipboard.writeText("");
    });

    teardown(cleanUpWorkspace);

    test("it holds the past kills and takes them for yank", async () => {
      const killRing = new KillRing(3);
      const emulator = new EmacsEmulator(activeTextEditor, killRing);

      // kill 3 times with different texts
      await clearTextEditor(activeTextEditor, "Lorem ipsum");
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      await clearTextEditor(activeTextEditor, "dolor sit amet,\nconsectetur adipiscing elit,");
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      await clearTextEditor(activeTextEditor, "sed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.");
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      // Initialize with non-empty text
      const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
      await clearTextEditor(activeTextEditor, initialText);

      // Set cursor at the middle of the text
      activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

      // yank + yankPop
      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );

      // Repeat
      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );

      // Repeat again
      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdesed do eiusmod tempor\nincididunt ut labore et\ndolore magna aliqua.fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdedolor sit amet,\nconsectetur adipiscing elit,fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );
    });

    test("works with clipboard", async () => {
      const killRing = new KillRing(3);
      const emulator = new EmacsEmulator(activeTextEditor, killRing);

      // Kill first
      await clearTextEditor(activeTextEditor, "Lorem ipsum");
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      // Then, copy to clipboard
      await vscode.env.clipboard.writeText("12345");

      // Initialize with non-empty text
      const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
      await clearTextEditor(activeTextEditor, initialText);

      // Set cursor at the middle of the text
      activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

      // yank firstly takes the text on clipboard
      await emulator.runCommand("yank");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcde12345fghij
ABCDEFGHIJ`,
      );

      // Then, yankPop takes from killRing
      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );

      // Repeat
      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcde12345fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );

      // Repeat again
      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcde12345fghij
ABCDEFGHIJ`,
      );

      await emulator.runCommand("yankPop");
      assertTextEqual(
        activeTextEditor,
        `0123456789
abcdeLorem ipsumfghij
ABCDEFGHIJ`,
      );
    });

    // Test yankPop is not executed after cursorMove or some other commands
    const otherInterruptingCommands = ["editor.action.selectAll"];
    const interruptingCommands: string[] = [...otherInterruptingCommands];

    interruptingCommands.forEach((interruptingCommand) => {
      test(`yankPop does not work if ${interruptingCommand} is executed after previous yank`, async () => {
        const killRing = new KillRing(3);
        const emulator = new EmacsEmulator(activeTextEditor, killRing);

        // Kill texts
        await clearTextEditor(activeTextEditor, "FOO");
        await vscode.commands.executeCommand("editor.action.selectAll");
        await emulator.runCommand("killRegion");

        await clearTextEditor(activeTextEditor, "BAR");
        await vscode.commands.executeCommand("editor.action.selectAll");
        await emulator.runCommand("killRegion");

        // Initialize with non-empty text
        const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
        await clearTextEditor(activeTextEditor, initialText);

        // Set cursor at the middle of the text
        activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

        // yank first
        await emulator.runCommand("yank");
        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdeBARfghij
ABCDEFGHIJ`,
        );

        // Interruption command invoked
        await vscode.commands.executeCommand(interruptingCommand);

        // yankPop does not work
        await emulator.runCommand("yankPop");
        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdeBARfghij
ABCDEFGHIJ`,
        );
      });

      test(`yankPop does not work if ${interruptingCommand} is executed after previous yankPop`, async () => {
        const killRing = new KillRing(3);
        const emulator = new EmacsEmulator(activeTextEditor, killRing);

        // Kill texts
        await clearTextEditor(activeTextEditor, "FOO");
        await vscode.commands.executeCommand("editor.action.selectAll");
        await emulator.runCommand("killRegion");

        await clearTextEditor(activeTextEditor, "BAR");
        await vscode.commands.executeCommand("editor.action.selectAll");
        await emulator.runCommand("killRegion");

        // Initialize with non-empty text
        const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
        await clearTextEditor(activeTextEditor, initialText);

        // Set cursor at the middle of the text
        activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

        // yank first
        await emulator.runCommand("yank");
        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdeBARfghij
ABCDEFGHIJ`,
        );

        // Then, yankPop
        await emulator.runCommand("yankPop");
        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdeFOOfghij
ABCDEFGHIJ`,
        );

        // Interruption command invoked
        await vscode.commands.executeCommand(interruptingCommand);

        // yankPop does not work
        await emulator.runCommand("yankPop");
        assertTextEqual(
          activeTextEditor,
          `0123456789
abcdeFOOfghij
ABCDEFGHIJ`,
        );
      });
    });

    suite("yankPop is not executed after editing or cursorMove commands", () => {
      let emulator: EmacsEmulator;

      const edits: Array<[string, () => Thenable<unknown>]> = [
        ["edit", () => activeTextEditor.edit((editBuilder) => editBuilder.insert(new Position(0, 0), "hoge"))],
        [
          "delete",
          () =>
            activeTextEditor.edit((editBuilder) =>
              editBuilder.delete(new Range(new Position(0, 0), new Position(0, 1))),
            ),
        ],
        [
          "replace",
          () =>
            activeTextEditor.edit((editBuilder) =>
              editBuilder.replace(new Range(new Position(0, 0), new Position(0, 1)), "hoge"),
            ),
        ],
      ];

      const moves = moveCommandIds.map((commandName): [string, () => Thenable<unknown> | void] => [
        commandName,
        () => emulator.runCommand(commandName),
      ]);

      setup(() => {
        const killRing = new KillRing(3);
        emulator = new EmacsEmulator(activeTextEditor, killRing);
      });

      [...edits, ...moves].forEach(([label, interruptOp]) => {
        test(`yankPop does not work if ${label} is executed after previous yank`, async () => {
          // Kill texts
          await clearTextEditor(activeTextEditor, "FOO");
          await vscode.commands.executeCommand("editor.action.selectAll");
          await emulator.runCommand("killRegion");

          await clearTextEditor(activeTextEditor, "BAR");
          await vscode.commands.executeCommand("editor.action.selectAll");
          await emulator.runCommand("killRegion");

          // Initialize with non-empty text
          const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
          await clearTextEditor(activeTextEditor, initialText);

          // Set cursor at the middle of the text
          activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

          // yank first
          await emulator.runCommand("yank");
          assertTextEqual(
            activeTextEditor,
            `0123456789
abcdeBARfghij
ABCDEFGHIJ`,
          );

          // Interruption command invoked
          await interruptOp();

          // yankPop does not work
          await emulator.runCommand("yankPop");
          assert.ok(activeTextEditor.document.getText().includes("BAR"));
          assert.ok(!activeTextEditor.document.getText().includes("FOO"));
        });

        test(`yankPop does not work if ${label} is executed after previous yankPop`, async () => {
          // Kill texts
          await clearTextEditor(activeTextEditor, "FOO");
          await vscode.commands.executeCommand("editor.action.selectAll");
          await emulator.runCommand("killRegion");

          await clearTextEditor(activeTextEditor, "BAR");
          await vscode.commands.executeCommand("editor.action.selectAll");
          await emulator.runCommand("killRegion");

          // Initialize with non-empty text
          const initialText = `0123456789
abcdefghij
ABCDEFGHIJ`;
          await clearTextEditor(activeTextEditor, initialText);

          // Set cursor at the middle of the text
          activeTextEditor.selection = new Selection(new Position(1, 5), new Position(1, 5));

          // yank first
          await emulator.runCommand("yank");
          assertTextEqual(
            activeTextEditor,
            `0123456789
abcdeBARfghij
ABCDEFGHIJ`,
          );

          // Then, yankPop
          await emulator.runCommand("yankPop");
          assertTextEqual(
            activeTextEditor,
            `0123456789
abcdeFOOfghij
ABCDEFGHIJ`,
          );

          // Interruption command invoked
          await interruptOp();

          // yankPop does not work
          // yankPop does not work
          await emulator.runCommand("yankPop");
          assert.ok(activeTextEditor.document.getText().includes("FOO"));
          assert.ok(!activeTextEditor.document.getText().includes("BAR"));
        });
      });
    });
  });

  suite("yank works with empty string", () => {
    setup(async () => {
      const initialText = "aaa";
      activeTextEditor = await setupWorkspace(initialText);
      await vscode.env.clipboard.writeText("");
    });

    teardown(cleanUpWorkspace);

    test("yank works with empty string", async () => {
      const killRing = new KillRing(3);
      const emulator = new EmacsEmulator(activeTextEditor, killRing);

      // Kill text
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      // Kill empty text
      await vscode.commands.executeCommand("editor.action.selectAll");
      await emulator.runCommand("killRegion");

      // Now the text is empty
      assertTextEqual(activeTextEditor, "");

      // Yank pastes "" (an emtpy string)
      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "");

      // YankPop pastes "aaa"
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "aaa");

      // YankPop pastes "" (an emtpy string)
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "");

      // YankPop pastes "aaa"
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "aaa");
    });
  });

  suite("yank works with multi cursor and empty string", () => {
    setup(async () => {
      const initialText = "aaa\nbbb\nccc";
      activeTextEditor = await setupWorkspace(initialText);
      await vscode.env.clipboard.writeText("");
    });

    teardown(cleanUpWorkspace);

    test("yank works with multi cursor and empty string", async () => {
      const killRing = new KillRing(3);
      const emulator = new EmacsEmulator(activeTextEditor, killRing);

      // Kill text
      activeTextEditor.selections = [
        new Selection(new Position(0, 0), new Position(0, 3)),
        new Selection(new Position(1, 0), new Position(1, 3)),
        new Selection(new Position(2, 0), new Position(2, 3)),
      ];
      await emulator.runCommand("killRegion");

      // Kill empty text
      activeTextEditor.selections = [
        new Selection(new Position(0, 0), new Position(0, 0)),
        new Selection(new Position(1, 0), new Position(1, 0)),
        new Selection(new Position(2, 0), new Position(2, 0)),
      ];
      await emulator.runCommand("killRegion");

      // Now the text is empty
      assertTextEqual(activeTextEditor, "\n\n");

      // Yank pastes "" (an emtpy string)
      await emulator.runCommand("yank");
      assertTextEqual(activeTextEditor, "\n\n");

      // YankPop pastes "aaa"
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "aaa\nbbb\nccc");

      // YankPop pastes "" (an emtpy string)
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "\n\n");

      // YankPop pastes "aaa"
      await emulator.runCommand("yankPop");
      assertTextEqual(activeTextEditor, "aaa\nbbb\nccc");
    });
  });
});

suite("yank pop with auto-indent", () => {
  let activeTextEditor: vscode.TextEditor;

  teardown(cleanUpWorkspace);

  test("Yank in a language that has auto-indent support", async function () {
    activeTextEditor = await setupWorkspace("", { language: "javascript" });
    activeTextEditor.options.tabSize = 4;
    activeTextEditor.options.insertSpaces = true;
    await delay(1000);

    const killRing = new KillRing(60);
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    // Kill texts
    await clearTextEditor(activeTextEditor, "foo"); // No indent
    await vscode.commands.executeCommand("editor.action.selectAll");
    await emulator.runCommand("killRegion");

    await clearTextEditor(activeTextEditor, "bar"); // No indent
    await vscode.commands.executeCommand("editor.action.selectAll");
    await emulator.runCommand("killRegion");

    // Initialize with parentheses, that triggers auto-indent to inner text
    const initialText = "{\n\n}";
    await clearTextEditor(activeTextEditor, initialText);
    setEmptyCursors(activeTextEditor, [1, 0]);
    await delay(100);

    // Yank pastes "bar" with auto-indentation
    await emulator.runCommand("yank");
    await delay(100);
    assertTextEqual(activeTextEditor, "{\n    bar\n}");

    // YankPop pastes "foo" with auto-indentation
    await emulator.runCommand("yankPop");
    await delay(100);
    assertTextEqual(activeTextEditor, "{\n    foo\n}");

    // yankPop again
    await emulator.runCommand("yankPop");
    await delay(100);
    assertTextEqual(activeTextEditor, "{\n    bar\n}");
  });
});

suite("Kill and yank with multi cursor, killing at 2 cursors in different lines", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace();

    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);

    await clearTextEditor(activeTextEditor, "hoge\nfuga\npiyo");
    // Kill texts from multiple selections
    activeTextEditor.selections = [
      new Selection(new Position(0, 0), new Position(0, 4)),
      new Selection(new Position(1, 0), new Position(1, 4)),
    ];
    await emulator.runCommand("killRegion");
    assertCursorsEqual(activeTextEditor, [0, 0], [1, 0]);

    await clearTextEditor(activeTextEditor, "foo\nbar\nbaz");
    // Again, kill texts from multiple selections, with different contents.
    activeTextEditor.selections = [
      new Selection(new Position(0, 0), new Position(0, 3)),
      new Selection(new Position(1, 0), new Position(1, 3)),
    ];
    await emulator.runCommand("killRegion");
    assertCursorsEqual(activeTextEditor, [0, 0], [1, 0]);
  });

  teardown(cleanUpWorkspace);

  test("Yank with the same number of cursors", async () => {
    // Yank pastes the killed texts to each cursor
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo\nbar\nbaz");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foofoo\nbarbar\nbaz");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foohoge\nbarfuga\nbaz");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foofoo\nbarbar\nbaz");
  });

  test("Yank at 1 cursor", async () => {
    await clearTextEditor(activeTextEditor, "");
    setEmptyCursors(activeTextEditor, [0, 0]);

    // Yank pastes the killed texts with concatenation
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo\nbar");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo\nbarfoo\nbar");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foo\nbarhoge\nfuga");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foo\nbarfoo\nbar");
  });

  test("Yank at 3 cursors", async () => {
    await clearTextEditor(activeTextEditor, "\n\n");
    setEmptyCursors(activeTextEditor, [0, 0], [1, 0], [2, 0]);

    // Yank pastes the killed texts with concatenation
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo\nbar\nfoo\nbar\nfoo\nbar");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo\nbarfoo\nbar\nfoo\nbarfoo\nbar\nfoo\nbarfoo\nbar");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foo\nbarhoge\nfuga\nfoo\nbarhoge\nfuga\nfoo\nbarhoge\nfuga");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foo\nbarfoo\nbar\nfoo\nbarfoo\nbar\nfoo\nbarfoo\nbar");
  });
});

suite("Kill and yank with multi cursor, killing at 2 cursors in one line", () => {
  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    activeTextEditor = await setupWorkspace();

    const killRing = new KillRing(60);
    emulator = new EmacsEmulator(activeTextEditor, killRing);

    await clearTextEditor(activeTextEditor, "hoge fuga piyo");
    // Kill texts from multiple selections
    activeTextEditor.selections = [
      new Selection(new Position(0, 0), new Position(0, 4)),
      new Selection(new Position(0, 5), new Position(0, 9)),
    ];
    await emulator.runCommand("killRegion");
    assertCursorsEqual(activeTextEditor, [0, 0], [0, 1]);

    await clearTextEditor(activeTextEditor, "foo bar baz");
    // Again, kill texts from multiple selections, with different contents.
    activeTextEditor.selections = [
      new Selection(new Position(0, 0), new Position(0, 3)),
      new Selection(new Position(0, 4), new Position(0, 7)),
    ];
    await emulator.runCommand("killRegion");
    assertCursorsEqual(activeTextEditor, [0, 0], [0, 1]);
  });

  teardown(cleanUpWorkspace);

  test("Yank with the same number of cursors", async () => {
    // Yank pastes the killed texts to each cursor
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foo bar baz");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foofoo barbar baz");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foohoge barfuga baz");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foofoo barbar baz");
  });

  test("Yank at 1 cursor", async () => {
    await clearTextEditor(activeTextEditor, "");
    setEmptyCursors(activeTextEditor, [0, 0]);

    // Yank pastes the killed texts with concatenation
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foobar");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foobarfoobar");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foobarhogefuga");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foobarfoobar");
  });

  test("Yank at 3 cursors", async () => {
    await clearTextEditor(activeTextEditor, "\n\n");
    setEmptyCursors(activeTextEditor, [0, 0], [1, 0], [2, 0]);

    // Yank pastes the killed texts with concatenation
    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foobar\nfoobar\nfoobar");

    await emulator.runCommand("yank");
    assertTextEqual(activeTextEditor, "foobarfoobar\nfoobarfoobar\nfoobarfoobar");

    // Yank pop works in the same way
    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foobarhogefuga\nfoobarhogefuga\nfoobarhogefuga");

    await emulator.runCommand("yankPop");
    assertTextEqual(activeTextEditor, "foobarfoobar\nfoobarfoobar\nfoobarfoobar");
  });
});

suite("With not only single text editor", () => {
  setup(async () => {
    await vscode.env.clipboard.writeText("");
  });

  teardown(cleanUpWorkspace);

  test("shares killRing amoung multiple editors", async function () {
    const killRing = new KillRing(3);

    const activeTextEditor0 = await setupWorkspace();
    const emulator0 = new EmacsEmulator(activeTextEditor0, killRing);

    // Kill texts from one text editor
    await clearTextEditor(activeTextEditor0, "FOO");
    await vscode.commands.executeCommand("editor.action.selectAll");
    await emulator0.runCommand("killRegion");

    await clearTextEditor(activeTextEditor0, "BAR");
    await vscode.commands.executeCommand("editor.action.selectAll");
    await emulator0.runCommand("killRegion");

    const activeTextEditor1 = await setupWorkspace("");
    const emulator1 = new EmacsEmulator(activeTextEditor1, killRing);

    // The killed texts are yanked on another text editor
    await emulator1.runCommand("yank");
    assertTextEqual(activeTextEditor1, "BAR");

    await emulator1.runCommand("yankPop");
    assertTextEqual(activeTextEditor1, "FOO");

    // Repeat
    await emulator1.runCommand("yankPop");
    assertTextEqual(activeTextEditor1, "BAR");

    await emulator1.runCommand("yankPop");
    assertTextEqual(activeTextEditor1, "FOO");
  });
});
