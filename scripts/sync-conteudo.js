#!/usr/bin/env node
// Copia product/refugio-sensorial/conteudo/*.json pra src/conteudo/bundled/ (ver 02-sdd.md,
// seção 16.3). Única fonte editável é product/; bundled/ é gerado, não editar à mão.
const fs = require('node:fs');
const path = require('node:path');

const ORIGEM = path.join(__dirname, '..', 'product', 'refugio-sensorial', 'conteudo');
const DESTINO = path.join(__dirname, '..', 'src', 'conteudo', 'bundled');

fs.mkdirSync(DESTINO, { recursive: true });

const arquivos = fs.readdirSync(ORIGEM).filter((f) => f.endsWith('.json'));
for (const arquivo of arquivos) {
  fs.copyFileSync(path.join(ORIGEM, arquivo), path.join(DESTINO, arquivo));
}

console.log(`sync-conteudo: ${arquivos.length} arquivo(s) copiado(s) pra src/conteudo/bundled/`);
