import * as path from "path";
import Mocha from "mocha";
import { glob } from "glob";

const isCI = process.env.CI != null && process.env.CI !== "false";

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    forbidOnly: isCI,
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname, "..");

  // Add files to the test suite
  const files = await glob("**/**.test.js", { cwd: testsRoot });
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  // Run the mocha test
  return new Promise((c, e) => {
    mocha.run((failures) => {
      if (failures > 0) {
        e(new Error(`${failures} tests failed.`));
      } else {
        c();
      }
    });
  });
}
