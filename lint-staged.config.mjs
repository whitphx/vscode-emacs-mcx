import micromatch from "micromatch";

export default {
  "*.{js,ts,mjs,mts}": (files) => {
    const match = micromatch.not(files, "vendor/");
    return `eslint --cache --fix ${match.join(" ")}`;
  },
  "*.{js,ts,mjs,mts,md,json,yml}": "prettier --write",
};
