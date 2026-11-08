#!/bin/sh
# The data folder is usually a bind mount owned by root; hand it to the node user, then drop privileges.
set -e
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"
exec su-exec node "$@"
