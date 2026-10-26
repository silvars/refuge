import { escolherFrase, frasesElegiveis } from './selecaoFrases';
import type { Frase } from './tipos';

function frase(parcial: Partial<Frase> & Pick<Frase, 'id'>): Frase {
  return {
    linha: 'neutra',
    uso: 'tela',
    estados: ['tempestade'],
    texto: { 'pt-BR': 'texto', en: null, fr: null, es: null },
    ativo: true,
    ...parcial,
  };
}

describe('frasesElegiveis', () => {
  const base = [
    frase({ id: 'a', linha: 'neutra', estados: ['tempestade'] }),
    frase({ id: 'b', linha: 'espiritual', estados: ['tempestade'] }),
    frase({ id: 'c', linha: 'neutra', estados: ['clareira'] }),
    frase({ id: 'd', linha: 'neutra', estados: ['tempestade'], ativo: false }),
    frase({ id: 'e', linha: 'neutra', estados: ['tempestade'], texto: { 'pt-BR': 'x', en: null, fr: null, es: null } }),
    frase({ id: 'f', linha: 'neutra', estados: ['tempestade'], uso: 'notificacao' }),
  ];

  it('filtra por linha ativa, clima, uso e idioma com texto não-nulo', () => {
    const r = frasesElegiveis(base, { clima: 'tempestade', uso: 'tela', linhasAtivas: ['neutra'], idioma: 'pt-BR' });
    expect(r.map((f) => f.id)).toEqual(['a', 'e']);
  });

  it('nunca escolhe entrada pendente (texto null) no idioma ativo', () => {
    const r = frasesElegiveis(base, { clima: 'tempestade', uso: 'tela', linhasAtivas: ['neutra'], idioma: 'en' });
    expect(r).toEqual([]);
  });

  it('inclui linha espiritual quando ativa', () => {
    const r = frasesElegiveis(base, {
      clima: 'tempestade',
      uso: 'tela',
      linhasAtivas: ['neutra', 'espiritual'],
      idioma: 'pt-BR',
    });
    expect(r.map((f) => f.id)).toEqual(['a', 'b', 'e']);
  });

  it('respeita o filtro de momento quando informado, mas aceita momento "qualquer" ou ausente', () => {
    const frases = [
      frase({ id: 'manha', uso: 'notificacao', momento: 'manha' }),
      frase({ id: 'noite', uso: 'notificacao', momento: 'noite' }),
      frase({ id: 'qualquer', uso: 'notificacao', momento: 'qualquer' }),
      frase({ id: 'sem-momento', uso: 'notificacao' }),
    ];
    const r = frasesElegiveis(frases, { clima: 'tempestade', uso: 'notificacao', linhasAtivas: ['neutra'], idioma: 'pt-BR', momento: 'manha' });
    expect(r.map((f) => f.id).sort()).toEqual(['manha', 'qualquer', 'sem-momento']);
  });
});

describe('escolherFrase', () => {
  it('retorna null quando não há elegíveis', () => {
    expect(escolherFrase([])).toBeNull();
  });

  it('escolhe determinística com rnd fixo (índice via Math.floor(rnd * n))', () => {
    const frases = [frase({ id: 'a' }), frase({ id: 'b' }), frase({ id: 'c' })];
    expect(escolherFrase(frases, () => 0)?.id).toBe('a');
    expect(escolherFrase(frases, () => 0.999)?.id).toBe('c');
  });
});
