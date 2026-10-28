#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v kitchen.sh >/dev/null 2>&1; then
    echo "Pentaho Kitchen not found. Install PDI and add kitchen.sh to PATH." >&2
    exit 1
fi

kitchen.sh -file="$ROOT_DIR/pentaho/jobs/jb_master_unsw_dw.kjb" -level=Basic
