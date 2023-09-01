// imports mocha for the browser, defining the `mocha` global.
require("mocha/mocha");

declare global {
  var IS_WEB_TEST: boolean | undefined; // eslint-disable-line no-var
}

globalThis.IS_WEB_TEST = true;

export function run(): Promise<void> {
  return new Promise((c, e) => {
    mocha.setup({
      ui: "tdd",
      reporter: undefined,
      timeout: 10000,
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
