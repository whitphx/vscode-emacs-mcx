/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const micromatch = require("micromatch");

module.exports = {
  "*.{js,ts,mjs,mts}": (files) => {
    const match = micromatch.not(files, path.join(__dirname, "./vendor/*"));
    return `eslint --cache --fix ${match.join(" ")}`;
  },
  "*.{js,ts,mjs,mts,md,json,yml}": (files) => {
    const match = micromatch.not(files, path.join(__dirname, "./vendor/*"));
    return `prettier --write ${match.join(" ")}`;
  },
};
