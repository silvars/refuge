#!/usr/bin/env bash
# Sobe o Metro bundler (precisa de um development build já instalado no simulador/aparelho).
# Para o primeiro build nativo, use scripts/ios.sh ou scripts/android.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_node.sh
node scripts/sync-conteudo.js
npx expo start
