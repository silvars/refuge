#!/usr/bin/env bash
# Garante Node 22 (ver .nvmrc) antes de qualquer comando do projeto.
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use >/dev/null 2>&1 || nvm install
