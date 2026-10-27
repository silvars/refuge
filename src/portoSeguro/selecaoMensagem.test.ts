import { aplicarNomeNaMensagem, mensagensDoClima, proximaMensagem } from './selecaoMensagem';
import type { ConteudoPortoSeguro } from '@/conteudo/tipos';

const CONTEUDO: ConteudoPortoSeguro = {
  versao: '2.0',
  mensagens: {
    tempestade: [
      { id: 't1', 'pt-BR': 'Oi! Mensagem 1', en: null, fr: null, es: null },
      { id: 't2', 'pt-BR': 'Oi! Mensagem 2', en: null, fr: null, es: null },
    ],
    nevoa: [{ id: 'n1', 'pt-BR': 'Oi! Névoa', en: null, fr: null, es: null }],
    clareira: [{ id: 'c1', 'pt-BR': 'Oi! Clareira', en: null, fr: null, es: null }],
  },
};

describe('mensagensDoClima', () => {
  it('retorna as mensagens do clima pedido', () => {
    expect(mensagensDoClima(CONTEUDO, 'tempestade')).toHaveLength(2);
    expect(mensagensDoClima(CONTEUDO, 'nevoa')).toHaveLength(1);
  });
});

describe('proximaMensagem', () => {
  it('avança pro próximo índice', () => {
    const mensagens = mensagensDoClima(CONTEUDO, 'tempestade');
    expect(proximaMensagem(mensagens, 0)).toEqual({ mensagem: mensagens[1], indice: 1 });
  });

  it('cicla de volta pra primeira ao passar do fim', () => {
    const mensagens = mensagensDoClima(CONTEUDO, 'tempestade');
    expect(proximaMensagem(mensagens, 1)).toEqual({ mensagem: mensagens[0], indice: 0 });
  });

  it('cicla na mesma mensagem quando só existe uma', () => {
    const mensagens = mensagensDoClima(CONTEUDO, 'nevoa');
    expect(proximaMensagem(mensagens, 0)).toEqual({ mensagem: mensagens[0], indice: 0 });
  });
});

describe('aplicarNomeNaMensagem', () => {
  it('troca "Oi!" por "Oi, <nome>!"', () => {
    expect(aplicarNomeNaMensagem('Oi! Tudo bem?', 'Ana')).toBe('Oi, Ana! Tudo bem?');
  });

  it('não mexe se não começar com "Oi!"', () => {
    expect(aplicarNomeNaMensagem('Olá! Tudo bem?', 'Ana')).toBe('Olá! Tudo bem?');
  });

  it('não mexe se não houver primeiro nome', () => {
    expect(aplicarNomeNaMensagem('Oi! Tudo bem?', '')).toBe('Oi! Tudo bem?');
  });
});
