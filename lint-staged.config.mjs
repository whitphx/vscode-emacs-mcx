import micromatch from "micromatch";

export default {
  "*.{js,ts,mjs,mts}": "eslint --cache --fix",
  "*.{js,ts,mjs,mts,md,json,yml}": (files) => {
    const match = micromatch.not(files, "vendor/");
    return `prettier --write ${match.join(" ")}`;
  },
};
