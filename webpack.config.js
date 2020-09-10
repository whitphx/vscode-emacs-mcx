//@ts-check

"use strict";

const path = require("path");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
//const CopyPlugin = require("copy-webpack-plugin");

/**@type {import('webpack').Configuration}*/
const config = {
  target: "node", // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: "./src/extension.ts", // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist"),
    filename: "lib/extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
  },
  node: {
    // NOTE: __dirname setting here and CopyPlugin setting below are important
    // for clipboardy to resolve fallback executables to work on Windows and Linux.
    // XXX: For that purpose, file output path is set to `dist/lib` but not `dist`,
    // which is inconsistent with tsconfig.json.
    // See https://github.com/tuttieee/vscode-emacs-mcx/issues/260
    __dirname: false,
  },
  // XXX: CopyPlugin does not support copying permissions. So now we use `cp` shell command outside webpack. It's inconsistent and fragile and should be fixed.
  //plugins: [new CopyPlugin([{ from: "node_modules/clipboardy/fallbacks", to: "fallbacks" }])],
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
    plugins: [new TsconfigPathsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};
module.exports = config;
