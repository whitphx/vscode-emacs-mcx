import * as vscode from "vscode";
import sinon from "sinon";
import assert from "assert";
import { EmacsEmulator } from "../../emulator";
import { cleanUpWorkspace, setupWorkspace } from "./utils";

suite("executeCommandWithPrefixArgument", () => {
  let commandMock: sinon.SinonExpectation;
  let commandDisposable: vscode.Disposable;

  let activeTextEditor: vscode.TextEditor;
  let emulator: EmacsEmulator;

  setup(async () => {
    commandMock = sinon.mock();
    commandDisposable = vscode.commands.registerCommand("emacs-mcx-test.foo", commandMock);

    activeTextEditor = await setupWorkspace();
    emulator = new EmacsEmulator(activeTextEditor);
  });

  teardown(async () => {
    commandDisposable.dispose();
    await cleanUpWorkspace();
  });

  test("executing another command", async () => {
    await emulator.executeCommandWithPrefixArgument("emacs-mcx-test.foo");

    assert.ok(commandMock.calledWith({ prefixArgument: undefined }));
    assert.strictEqual(emulator.getPrefixArgument(), undefined);
  });

  test("executing another command with the prefix argument", async () => {
    await emulator.universalArgument();

    await emulator.executeCommandWithPrefixArgument("emacs-mcx-test.foo");

    assert.ok(commandMock.calledWith({ prefixArgument: 4 }));
    assert.strictEqual(emulator.getPrefixArgument(), undefined);
  });

  test("executing another command with arguments", async () => {
    await emulator.executeCommandWithPrefixArgument("emacs-mcx-test.foo", { foo: "bar", baz: 42 });

    assert.ok(commandMock.calledWith({ foo: "bar", baz: 42, prefixArgument: undefined }));
    assert.strictEqual(emulator.getPrefixArgument(), undefined);
  });

  test("executing another command with the passed arguments and the prefix argument", async () => {
    await emulator.universalArgument();

    await emulator.executeCommandWithPrefixArgument("emacs-mcx-test.foo", { foo: "bar", baz: 42 });

    assert.ok(commandMock.calledWith({ foo: "bar", baz: 42, prefixArgument: 4 }));
    assert.strictEqual(emulator.getPrefixArgument(), undefined);
  });

  test("executing another command with the customized prefix argument key", async () => {
    await emulator.universalArgument();

    await emulator.executeCommandWithPrefixArgument("emacs-mcx-test.foo", {}, "repeat");

    assert.ok(commandMock.calledWith({ repeat: 4 }));
  });
});
