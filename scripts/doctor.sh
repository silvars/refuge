#!/usr/bin/env bash
# Diagnostica inconsistências de dependências/config (expo-doctor) e sugere alinhamentos
# de versão com o SDK instalado (expo install --check). Ver 02-sdd.md, seção 2, nota de atualização.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_node.sh
npx expo install --check
npx expo-doctor
