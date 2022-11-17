import * as path from "path";
import Mocha from "mocha";
import glob from "glob";
import * as vscode from "vscode";

export function run(): Promise<void> {
  // If the panel is visible, its child editors can appear in `vscode.window.visibleTextEditors` and they cannot be closed with the `workbench.action.closeAllEditors`.
  // It leads to timeout because `cleanUpWorkspace()` will be stuck on waiting for all the editors to be closed.
  // So we ensure the panel is closed before the tests.
  vscode.commands.executeCommand("workbench.action.closePanel");

  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    forbidOnly: true,
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname, "..");

  return new Promise((c, e) => {
    glob("**/**.test.js", { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err);
      }

      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        e(err);
      }
    });
  });
}
