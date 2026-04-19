import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Use a throwaway user-data-dir that disables TypeScript Automatic Type
    // Acquisition. ATA shells out to npm to fetch `types-registry` and
    // `@types/*`; in CI, Aikido Safe-chain wraps npm and rejects downloads of
    // packages younger than its minimum-age threshold, failing the test step
    // after the tests themselves pass. We keep the TypeScript extension
    // enabled because some tests (e.g. FindDefinitions) rely on its language
    // features.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "emacs-mcx-test-user-"));
    const userSettingsDir = path.join(userDataDir, "User");
    fs.mkdirSync(userSettingsDir, { recursive: true });
    fs.writeFileSync(
      path.join(userSettingsDir, "settings.json"),
      JSON.stringify({ "typescript.disableAutomaticTypeAcquisition": true }),
    );

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [`--user-data-dir=${userDataDir}`],
    });
  } catch (err) {
    console.error(err);
    console.error("Failed to run tests");
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
