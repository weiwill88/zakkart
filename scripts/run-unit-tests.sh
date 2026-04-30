#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/cloudfunctions/api"
npm test

cd "$ROOT_DIR/admin"
npm test

cd "$ROOT_DIR"
node --test "miniprogram/tests/**/*.test.js"
