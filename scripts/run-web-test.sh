#!/bin/bash -u
ARGS=$@
ROOT="$(dirname "$(dirname "$(realpath "$0")")")"

# Remove the "*" activation event from package.json
# so that the extension is not activated when running tests.
# Ref: https://github.com/microsoft/vscode-test-web/issues/96#issuecomment-1702658443
setup() {
  echo "Rename package.json to package.json.bk"
  mv ${ROOT}/package.json ${ROOT}/package.json.bk
  echo "Remove the \"*\" activation event from package.json"
  jq '.activationEvents |= map(select(. != "onStartupFinished"))' ${ROOT}/package.json.bk > ${ROOT}/package.json
}

tearDown() {
  echo "Restore package.json"
  mv ${ROOT}/package.json.bk ${ROOT}/package.json
}

setup

yarn vscode-test-web \
  --browserType=chromium \
  --extensionDevelopmentPath=. \
  --extensionTestsPath=dist/web/test/suite/index.js \
  --permission clipboard-read \
  --permission clipboard-write \
  $ARGS
retval=$?

tearDown

exit $retval
