import { File, Paths } from 'expo-file-system';

import type { ArquivoConteudo } from './arquivos';
import estados from './bundled/estados.json';
import etiquetas from './bundled/etiquetas.json';
import frases from './bundled/frases.json';
import perguntas from './bundled/perguntas.json';
import portoSeguro from './bundled/porto-seguro.json';
import respiracao from './bundled/respiracao.json';
import { atualizarSeNecessario } from './remoto';

// Fachada de leitura (ver 02-sdd.md, seção 16): sempre lê do cache local se existir, senão do
// bundled — NUNCA espera rede. A checagem do CDN roda em paralelo, sem bloquear, e só passa a
// valer na próxima leitura (seção 16.2). Tipos de retorno ainda são `unknown`: o esquema detalhado
// de cada arquivo (além de `versao`) será modelado quando as telas que os consomem forem
// implementadas (Fase 2/3) — aqui a responsabilidade é só a cadeia de fallback + cache.

const BUNDLED: Record<ArquivoConteudo, unknown> = {
  estados,
  etiquetas,
  frases,
  perguntas,
  'porto-seguro': portoSeguro,
  respiracao,
};

const cacheEmMemoria = new Map<ArquivoConteudo, unknown>();

function arquivoCache(nome: ArquivoConteudo): File {
  return new File(Paths.document, 'conteudo', `${nome}.json`);
}

async function ler(nome: ArquivoConteudo): Promise<unknown> {
  const emMemoria = cacheEmMemoria.get(nome);
  if (emMemoria !== undefined) return emMemoria;

  const arquivo = arquivoCache(nome);
  let dado = BUNDLED[nome];
  if (arquivo.exists) {
    try {
      dado = JSON.parse(await arquivo.text());
    } catch {
      dado = BUNDLED[nome];
    }
  }
  cacheEmMemoria.set(nome, dado);

  // Best-effort, em paralelo — nunca bloqueia a leitura atual (ver remoto.ts).
  atualizarSeNecessario(nome, BUNDLED[nome]).catch(() => {});

  return dado;
}

export function getEstados(): Promise<unknown> {
  return ler('estados');
}
export function getEtiquetas(): Promise<unknown> {
  return ler('etiquetas');
}
export function getFrases(): Promise<unknown> {
  return ler('frases');
}
export function getPerguntas(): Promise<unknown> {
  return ler('perguntas');
}
export function getPortoSeguro(): Promise<unknown> {
  return ler('porto-seguro');
}
export function getRespiracao(): Promise<unknown> {
  return ler('respiracao');
}
