import assert from "assert";
import * as vscode from "vscode";
import { WorkspaceConfigCache } from "../../workspace-configuration";

suite("WorkspaceConfigCache", () => {
  const testCases: [string, string][] = [
    ["editor.find", "seedSearchStringFromSelection"],
    ["editor.find", "globalFindClipboard"],
  ];
  testCases.forEach(([section, key]) => {
    test(`it returns the right value for ${section}.${key}`, () => {
      assert.strictEqual(WorkspaceConfigCache.get(section)[key], vscode.workspace.getConfiguration(section)[key]);
    });
  });

  test("it caches the config section so that accessing the values is faster than the normal getConfiguration()", () => {
    const timeElapsedWithCache = (() => {
      const t0 = Date.now();
      for (let i = 0; i < 1000000; ++i) {
        WorkspaceConfigCache.get("editor.find");
      }
      const t1 = Date.now();

      return t1 - t0;
    })();

    const timeElapsedWithoutCache = (() => {
      const t0 = Date.now();
      for (let i = 0; i < 1000000; ++i) {
        vscode.workspace.getConfiguration("editor.find");
      }
      const t1 = Date.now();

      return t1 - t0;
    })();

    assert.ok(timeElapsedWithoutCache / timeElapsedWithCache > 100);
  });
});
