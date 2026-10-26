import { Directory, File, Paths } from 'expo-file-system';

import type { ArquivoConteudo } from './arquivos';
import { mesmoFormato } from './esquema';
import { compararVersoes } from './versao';

// Camada 3 (ver 02-sdd.md, seção 16): checa o CDN em background e atualiza o cache local se a
// versão remota for mais nova e válida. NUNCA lança — qualquer falha (offline, CDN fora do ar,
// JSON malformado) é ignorada silenciosamente, mantendo o que já tinha (seção 16.2).

const BASE_CDN = 'https://cdn.jsdelivr.net/gh/silvars/refuge@main/product/refugio-sensorial/conteudo';

function diretorioConteudo(): Directory {
  const dir = new Directory(Paths.document, 'conteudo');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function arquivoCache(nome: ArquivoConteudo): File {
  return new File(diretorioConteudo(), `${nome}.json`);
}

interface ConteudoComVersao {
  versao: string;
}

/** Busca a versão remota; se mais nova e com o mesmo formato do bundled, grava no cache local. */
export async function atualizarSeNecessario(nome: ArquivoConteudo, bundled: unknown): Promise<void> {
  try {
    const resposta = await fetch(`${BASE_CDN}/${nome}.json`);
    if (!resposta.ok) return;
    const remoto: unknown = await resposta.json();
    if (!mesmoFormato(bundled, remoto)) return;

    const arquivo = arquivoCache(nome);
    const versaoLocal = arquivo.exists
      ? (JSON.parse(await arquivo.text()) as ConteudoComVersao).versao
      : (bundled as ConteudoComVersao).versao;
    const versaoRemota = (remoto as ConteudoComVersao).versao;

    if (compararVersoes(versaoRemota, versaoLocal) > 0) {
      await arquivo.write(JSON.stringify(remoto));
    }
  } catch {
    // offline, CDN fora do ar ou JSON quebrado — mantém o conteúdo já conhecido.
  }
}
