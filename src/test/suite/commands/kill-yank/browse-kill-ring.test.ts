import * as vscode from "vscode";
import * as sinon from "sinon";
import * as assert from "assert";
import { EmacsEmulator } from "../../../../emulator";
import { KillRing } from "../../../../kill-yank/kill-ring";
import { ClipboardTextKillRingEntity } from "../../../../kill-yank/kill-ring-entity/clipboard-text";
import { assertTextEqual, cleanUpWorkspace, setEmptyCursors, setupWorkspace } from "../../utils";

suite("browse-kill-ring", () => {
  let activeTextEditor: vscode.TextEditor;

  setup(async () => {
    const initialText = "";
    activeTextEditor = await setupWorkspace(initialText);
  });

  teardown(async () => {
    await cleanUpWorkspace();
    sinon.restore();
  });

  test("yanking a selected text, and the second call works as yank, not as yank-pop", async () => {
    const killRing = new KillRing();
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    const browseStub = sinon.stub(killRing, "browse").resolves(new ClipboardTextKillRingEntity("Selected"));

    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("browseKillRing");

    assert.strictEqual(browseStub.calledOnce, true);
    assert.strictEqual(browseStub.firstCall.args.length, 0);

    assertTextEqual(activeTextEditor, "Selected");

    await emulator.runCommand("browseKillRing");

    assert.strictEqual(browseStub.calledTwice, true);
    assert.strictEqual(browseStub.secondCall.args.length, 0);

    assertTextEqual(activeTextEditor, "SelectedSelected");
  });

  test("browse-kill-ring works as yank-pop when called after yank", async () => {
    const killRing = new KillRing();
    const emulator = new EmacsEmulator(activeTextEditor, killRing);

    const killRingEntity = new ClipboardTextKillRingEntity("aaa");
    sinon.stub(killRingEntity, "isSameClipboardText").returns(true);
    killRing.push(killRingEntity);

    const browseStub = sinon.stub(killRing, "browse").resolves(new ClipboardTextKillRingEntity("Selected"));

    setEmptyCursors(activeTextEditor, [0, 0]);

    await emulator.runCommand("yank");

    assertTextEqual(activeTextEditor, "aaa");

    await emulator.runCommand("browseKillRing");

    assert.strictEqual(browseStub.calledOnce, true);
    assert.strictEqual(browseStub.firstCall.args.length, 0);

    assertTextEqual(activeTextEditor, "Selected");

    await emulator.runCommand("browseKillRing");

    assert.strictEqual(browseStub.calledTwice, true);
    assert.strictEqual(browseStub.secondCall.args.length, 0);

    assertTextEqual(activeTextEditor, "SelectedSelected");
  });
});
