#!/usr/bin/env bash
# Builda o development build nativo e abre o Simulador de iOS (Xcode precisa estar instalado).
# Primeira execução demora (CocoaPods + compilação); próximas são incrementais.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_node.sh
node scripts/sync-conteudo.js
npx expo run:ios
