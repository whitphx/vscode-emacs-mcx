import assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { MessageManager, MESSAGE_DISPLAY_DELAY_MS } from "../../message";
import { delay } from "./utils";

suite("MessageManager", () => {
  let sandbox: sinon.SinonSandbox;
  let setStatusBarMessageStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();
    setStatusBarMessageStub = sandbox
      .stub(vscode.window, "setStatusBarMessage")
      .callsFake(() => new vscode.Disposable(() => {}));
  });

  teardown(() => {
    MessageManager.instance.dispose();
    sandbox.restore();
  });

  test("shows message immediately when not deferring", () => {
    MessageManager.showMessage("Hello");

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Hello");
  });

  test("defers message until the lock is released", async () => {
    // We test this with async function to ensure the defer lock is properly released
    await MessageManager.withMessageDefer(async () => {
      MessageManager.showMessage("Deferred");
      assert.strictEqual(setStatusBarMessageStub.callCount, 0);
      await Promise.resolve(); // Nothing happens but we put `await` here to emphasize the async context
    });

    await delay(MESSAGE_DISPLAY_DELAY_MS);

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Deferred");
  });

  test("clears deferral when no message was deferred", () => {
    const manager = MessageManager.instance;
    manager.startDeferringMessage();
    manager.showDeferredMessage();

    MessageManager.showMessage("Shown immediately");

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Shown immediately");
  });

  test("throws when releasing a deferral without acquiring it", () => {
    assert.throws(() => MessageManager.instance.showDeferredMessage(), /Mismatched/);
  });
});
