import * as path from "path";
import Mocha from "mocha";
import glob from "glob";

const isCI = process.env.CI != null && process.env.CI !== "false";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    forbidOnly: isCI,
    color: true,
    timeout: 10000,
    retries: 2,
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
