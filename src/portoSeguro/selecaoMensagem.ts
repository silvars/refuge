// Seleção/ciclo de mensagens do Porto Seguro por clima (ver especificação F8, itens 2-3).

import type { Clima } from '@/domain/tipos';
import type { ConteudoPortoSeguro, MensagemPortoSeguro } from '@/conteudo/tipos';

export function mensagensDoClima(conteudo: ConteudoPortoSeguro, clima: Clima): readonly MensagemPortoSeguro[] {
  return conteudo.mensagens[clima];
}

/** Próxima mensagem do mesmo clima, ciclando de volta pra primeira ao chegar no fim. */
export function proximaMensagem(
  mensagens: readonly MensagemPortoSeguro[],
  indiceAtual: number,
): { mensagem: MensagemPortoSeguro; indice: number } {
  const indice = (indiceAtual + 1) % mensagens.length;
  return { mensagem: mensagens[indice], indice };
}

/**
 * "Oi!" vira "Oi, <primeiro nome>!" ao escolher o contato — só se o texto começar exatamente
 * assim (ver especificação F8, item 5; traduções em outros idiomas podem não seguir esse padrão).
 */
export function aplicarNomeNaMensagem(texto: string, primeiroNome: string): string {
  if (!primeiroNome || !texto.startsWith('Oi!')) return texto;
  return `Oi, ${primeiroNome}!${texto.slice('Oi!'.length)}`;
}
