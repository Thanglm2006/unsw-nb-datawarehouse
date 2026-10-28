#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

KITCHEN_BIN="$(command -v kitchen.sh || command -v kitchen || true)"
if [[ -z "$KITCHEN_BIN" ]]; then
    echo "Pentaho Kitchen not found. Install pdi-ce and add kitchen to PATH." >&2
    exit 1
fi

"$KITCHEN_BIN" -file="$ROOT_DIR/pentaho/jobs/jb_master_unsw_dw.kjb" -level=Basic
