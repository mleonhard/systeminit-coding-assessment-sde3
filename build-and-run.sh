#/usr/bin/env sh
set -e
set -x
npm run build
cargo run
