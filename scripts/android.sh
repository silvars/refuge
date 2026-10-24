#!/usr/bin/env bash
# Builda o development build nativo e abre no emulador/aparelho Android conectado
# (Android Studio/SDK precisa estar instalado; ver $ANDROID_HOME).
# Primeira execução demora (Gradle + compilação); próximas são incrementais.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_node.sh
npx expo run:android
