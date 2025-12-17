/* eslint-disable @typescript-eslint/require-await */
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

    await delay(MESSAGE_DISPLAY_DELAY_MS + 10);

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Deferred");
  });

  test("shows message only after nested defers are released", async () => {
    await MessageManager.withMessageDefer(async () => {
      await MessageManager.withMessageDefer(async () => {
        MessageManager.showMessage("Nested");
      });

      await delay(MESSAGE_DISPLAY_DELAY_MS + 10);
      assert.strictEqual(setStatusBarMessageStub.callCount, 0);
    });

    await delay(MESSAGE_DISPLAY_DELAY_MS + 10);

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Nested");
  });

  test("keeps deferred message visible when interrupted during display delay", async () => {
    const clock = sandbox.useFakeTimers();
    const manager = MessageManager.instance;
    const disposable = { dispose: sandbox.spy() } as vscode.Disposable;

    setStatusBarMessageStub.callsFake(() => disposable);

    const showMessageImmediatelyStub = sandbox.stub(manager, "showMessageImmediately").callsFake((text: string) => {
      MessageManager.prototype.showMessageImmediately.call(manager, text);
      manager.onInterrupt();
    });

    await MessageManager.withMessageDefer(async () => {
      MessageManager.showMessage("Interrupted");
    });

    await clock.tickAsync(MESSAGE_DISPLAY_DELAY_MS);

    assert.strictEqual(showMessageImmediatelyStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Interrupted");
    assert.strictEqual((disposable.dispose as sinon.SinonSpy).callCount, 0);
  });

  test("shows message immediately even while deferring", async () => {
    await MessageManager.withMessageDefer(async () => {
      MessageManager.showMessageImmediately("Immediate");
      assert.strictEqual(setStatusBarMessageStub.callCount, 1);
      assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Immediate");
    });

    await delay(MESSAGE_DISPLAY_DELAY_MS + 10);

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
  });

  test("releases defer lock when inner callback throws", async () => {
    await assert.rejects(
      MessageManager.withMessageDefer(async () => {
        MessageManager.showMessage("Deferred error");
        throw new Error("boom");
      }),
      /boom/,
    );

    await delay(MESSAGE_DISPLAY_DELAY_MS + 10);

    assert.strictEqual(setStatusBarMessageStub.callCount, 1);
    assert.strictEqual(setStatusBarMessageStub.firstCall.args[0], "Deferred error");
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
