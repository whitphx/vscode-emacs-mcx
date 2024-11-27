/* eslint-env browser */

// imports mocha for the browser, defining the `mocha` global.
import "mocha/mocha";

export function run(): Promise<void> {
  return new Promise((c, e) => {
    mocha.setup({
      ui: "tdd",
      reporter: undefined,
      timeout: 10000,
      retries: 2,
    });

    // bundles all files in the current directory matching `*.test`
    const importAll = (r: __WebpackModuleApi.RequireContext) => r.keys().forEach(r);
    importAll(require.context("../../../test/suite", true, /\.test$/));

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
      console.error(err);
      e(err);
    }
  });
}
