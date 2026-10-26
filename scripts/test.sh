#!/usr/bin/env bash
# Mesma validação do CI (.github/workflows/ci.yml): lint + typecheck + testes.
# Rodar antes de todo commit (ver AGENTS.md).
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_node.sh
node scripts/sync-conteudo.js
npm run lint
npm run typecheck
npm test
