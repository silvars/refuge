import { File, Paths } from 'expo-file-system';

import type { ArquivoConteudo } from './arquivos';
import estados from './bundled/estados.json';
import etiquetas from './bundled/etiquetas.json';
import frases from './bundled/frases.json';
import perguntas from './bundled/perguntas.json';
import portoSeguro from './bundled/porto-seguro.json';
import respiracao from './bundled/respiracao.json';
import { atualizarSeNecessario } from './remoto';
import type {
  ConteudoEstados,
  ConteudoEtiquetas,
  ConteudoFrases,
  ConteudoPerguntas,
  ConteudoPortoSeguro,
  ConteudoRespiracao,
} from './tipos';

// Fachada de leitura (ver 02-sdd.md, seção 16): sempre lê do cache local se existir, senão do
// bundled — NUNCA espera rede. A checagem do CDN roda em paralelo, sem bloquear, e só passa a
// valer na próxima leitura (seção 16.2).

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

export function getEstados(): Promise<ConteudoEstados> {
  return ler('estados') as Promise<ConteudoEstados>;
}
export function getEtiquetas(): Promise<ConteudoEtiquetas> {
  return ler('etiquetas') as Promise<ConteudoEtiquetas>;
}
export function getFrases(): Promise<ConteudoFrases> {
  return ler('frases') as Promise<ConteudoFrases>;
}
export function getPerguntas(): Promise<ConteudoPerguntas> {
  return ler('perguntas') as Promise<ConteudoPerguntas>;
}
export function getPortoSeguro(): Promise<ConteudoPortoSeguro> {
  return ler('porto-seguro') as Promise<ConteudoPortoSeguro>;
}
export function getRespiracao(): Promise<ConteudoRespiracao> {
  return ler('respiracao') as Promise<ConteudoRespiracao>;
}
