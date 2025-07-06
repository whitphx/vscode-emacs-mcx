#!/bin/bash -eu

VERSION=${1:-}
if [ -z "${VERSION}" ]; then
  echo "VERSION must be set."
  exit -1
fi

PRE_RELEASE_GIT_TAG_SUFFIX=""
PRE_RELEASE_GIT_COMMENT_SUFFIX=""
PRE_RELEASE_OPTION=${2:-}
if [ "${PRE_RELEASE_OPTION}" = "pre" ]; then
  echo "Set the Git tag of this version as pre-release."
  PRE_RELEASE_GIT_TAG_SUFFIX="-pre"
  PRE_RELEASE_GIT_COMMENT_SUFFIX=" (pre-release)"
fi

if [[ $(git diff --stat) != '' ]]; then
  echo 'Git working tree is dirty.'
  exit -1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "${CURRENT_BRANCH}" != "main" ]; then
  echo "Not on main branch (currently on ${CURRENT_BRANCH}). Aborting."
  exit -1
fi

echo "Set version"
npm version --new-version ${VERSION} --no-git-tag-version
CURRENT_VERSION=`node --print 'require("./package.json").version'`

echo "Add and commit package.json"
git add package.json package-lock.json
git commit -m "Version ${CURRENT_VERSION}${PRE_RELEASE_GIT_COMMENT_SUFFIX}"

GIT_TAG="v${CURRENT_VERSION}${PRE_RELEASE_GIT_TAG_SUFFIX}"
echo "Set git tag as ${GIT_TAG}"
git tag -a ${GIT_TAG} -m ${CURRENT_VERSION}
