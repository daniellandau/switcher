#!/usr/bin/env bash

# error out on unset variables
set -o nounset;
# error out on the first error
set -o errexit;
# error out on pipe errors
set -o pipefail;


# get this scripts folder
SCRIPT_FOLDER="$(cd $(dirname ${0}); pwd -P)";

SESSION_TYPE="${1:-x11}";

"${SCRIPT_FOLDER}/"session.sh \
  "${SESSION_TYPE}" \
  "${SCRIPT_FOLDER}/" \
  "switcher@landau.fi" \
;
