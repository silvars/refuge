import {
  dominant,
  finish,
  isLight,
  isStale,
  layerOpacities,
  mixColor,
  nextStreak,
  normalize,
  shouldSuggestPorto,
  shuffleOrders,
  totals,
  zero,
} from './clima';
import type { Clima, Pesos, PerguntaPeso } from './tipos';

function pergunta(...pesos: Partial<Pesos>[]): PerguntaPeso {
  return { opcoes: pesos.map((p) => ({ pesos: p })) };
}

describe('totals', () => {
  it('soma os pesos das respostas dadas e ignora as ainda não respondidas', () => {
    const perguntas = [pergunta({ tempestade: 1 }, { nevoa: 1 }), pergunta({ clareira: 1 }, { nevoa: 0.5, clareira: 0.5 })];
    const resultado = totals(perguntas, [0, null], null);
    expect(resultado).toEqual({ tempestade: 1, nevoa: 0, clareira: 0 });
  });

  it('soma o clima anterior com peso 1.5', () => {
    const perguntas = [pergunta({ clareira: 1 })];
    const resultado = totals(perguntas, [0], 'tempestade');
    expect(resultado).toEqual({ tempestade: 1.5, nevoa: 0, clareira: 1 });
  });

  it('trata chaves de peso ausentes como zero', () => {
    const perguntas = [pergunta({ tempestade: 1 })];
    const resultado = totals(perguntas, [0], null);
    expect(resultado.nevoa).toBe(0);
    expect(resultado.clareira).toBe(0);
  });
});

describe('normalize', () => {
  it('retorna frações que somam 1', () => {
    const n = normalize({ tempestade: 1, nevoa: 1, clareira: 2 });
    expect(n).not.toBeNull();
    expect(n!.tempestade + n!.nevoa + n!.clareira).toBeCloseTo(1);
    expect(n).toEqual({ tempestade: 0.25, nevoa: 0.25, clareira: 0.5 });
  });

  it('retorna null quando a soma é zero ou negativa', () => {
    expect(normalize(zero())).toBeNull();
  });
});

describe('layerOpacities', () => {
  it('neutro sempre 1 e tudo zero quando não há mistura', () => {
    expect(layerOpacities(zero())).toEqual({ neutro: 1, tempestade: 0, nevoa: 0, clareira: 0, wc: 0 });
  });

  // A composição das 3 camadas empilhadas (alpha compositing "over", tempestade embaixo,
  // névoa no meio, clareira em cima) precisa reconstruir exatamente a média ponderada —
  // é a garantia central do motor de clima (02-sdd.md, seção 6).
  it.each<[Pesos]>([
    [{ tempestade: 1, nevoa: 1, clareira: 1 }],
    [{ tempestade: 3, nevoa: 1, clareira: 0 }],
    [{ tempestade: 0, nevoa: 1, clareira: 3 }],
    [{ tempestade: 0.3, nevoa: 1.5, clareira: 0.2 }],
    [{ tempestade: 1, nevoa: 0, clareira: 0 }],
    [{ tempestade: 0, nevoa: 0, clareira: 1 }],
  ])('reconstrói a média ponderada exata para %j', (pesos) => {
    const n = normalize(pesos)!;
    const op = layerOpacities(pesos);
    const A = 10; // cor "tempestade"
    const B = 20; // cor "névoa"
    const C = 30; // cor "clareira"
    const mid = op.nevoa * B + (1 - op.nevoa) * A;
    const final = op.clareira * C + (1 - op.clareira) * mid;
    const esperado = n.tempestade * A + n.nevoa * B + n.clareira * C;
    expect(final).toBeCloseTo(esperado, 10);
  });
});

describe('isLight', () => {
  it('true quando a clareira é >= 55% e não está esmaecido', () => {
    expect(isLight({ tempestade: 0, nevoa: 0, clareira: 1 }, false)).toBe(true);
    expect(isLight({ tempestade: 0.44, nevoa: 0, clareira: 0.56 }, false)).toBe(true);
  });

  it('false quando esmaecido, mesmo com clareira dominante', () => {
    expect(isLight({ tempestade: 0, nevoa: 0, clareira: 1 }, true)).toBe(false);
  });

  it('false quando clareira < 55%', () => {
    expect(isLight({ tempestade: 0.5, nevoa: 0, clareira: 0.5 }, false)).toBe(false);
  });
});

describe('finish', () => {
  it('escolhe o clima com maior soma quando não há empate', () => {
    const perguntas = [pergunta({ tempestade: 1 }), pergunta({ tempestade: 1 }), pergunta({ clareira: 1 })];
    const r = finish(perguntas, [0, 0, 0]);
    expect(r.mood).toBe('tempestade');
    expect(r.mix.tempestade + r.mix.nevoa + r.mix.clareira).toBeCloseTo(100, 0);
  });

  it('desempata pelo peso da resposta mais recente entre os climas empatados', () => {
    // tempestade e clareira empatam em 1; a pergunta mais recente (índice 1) pesa
    // tudo em clareira (0) contra tempestade (0) — mas clareira vence porque seu peso
    // na resposta mais recente (1) é maior que o de tempestade (0) entre os empatados.
    const perguntas = [pergunta({ tempestade: 1 }), pergunta({ clareira: 1 })];
    const r = finish(perguntas, [0, 0]);
    expect(r.mood).toBe('clareira');
  });

  it('mistura soma ~100', () => {
    const perguntas = [pergunta({ tempestade: 1 }), pergunta({ nevoa: 1 }), pergunta({ clareira: 2 })];
    const r = finish(perguntas, [0, 0, 0]);
    const soma = r.mix.tempestade + r.mix.nevoa + r.mix.clareira;
    expect(soma).toBeGreaterThanOrEqual(99);
    expect(soma).toBeLessThanOrEqual(101);
  });
});

describe('dominant', () => {
  it('retorna o clima com maior peso', () => {
    expect(dominant({ tempestade: 0.2, nevoa: 0.7, clareira: 0.1 })).toBe('nevoa');
  });

  it('retorna null quando tudo é zero', () => {
    expect(dominant(zero())).toBeNull();
  });
});

describe('nextStreak / shouldSuggestPorto', () => {
  it('zera a sequência na clareira e incrementa nos outros climas', () => {
    expect(nextStreak(2, 'clareira')).toBe(0);
    expect(nextStreak(2, 'tempestade')).toBe(3);
    expect(nextStreak(0, 'nevoa')).toBe(1);
  });

  it('sugere Porto Seguro a partir de 3 check-ins seguidos', () => {
    expect(shouldSuggestPorto(2)).toBe(false);
    expect(shouldSuggestPorto(3)).toBe(true);
    expect(shouldSuggestPorto(4)).toBe(true);
  });
});

describe('isStale', () => {
  const HORA = 3600 * 1000;

  it('false sem check-in anterior', () => {
    expect(isStale(null, Date.now())).toBe(false);
  });

  it('false antes de 12h, true depois', () => {
    const agora = 1_000_000_000_000;
    expect(isStale(agora - 11 * HORA, agora)).toBe(false);
    expect(isStale(agora - 13 * HORA, agora)).toBe(true);
  });
});

describe('shuffleOrders', () => {
  it('produz uma ordem estável para o mesmo gerador de números (reprodutível dentro da sessão)', () => {
    const perguntas = [pergunta({}, {}, {}, {}), pergunta({}, {}, {}, {})];
    const sequencia = [0.9, 0.1, 0.5, 0.9, 0.1, 0.5];
    let i = 0;
    const rnd = () => sequencia[i++ % sequencia.length];

    const a = shuffleOrders(perguntas, rnd);
    i = 0;
    const b = shuffleOrders(perguntas, rnd);

    expect(a).toEqual(b);
  });

  it('cada ordem é uma permutação dos índices originais', () => {
    const perguntas = [pergunta({}, {}, {}, {})];
    const [ordem] = shuffleOrders(perguntas, Math.random);
    expect([...ordem].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('mixColor', () => {
  const paleta: Record<Clima, readonly [number, number, number]> = {
    tempestade: [96, 150, 214],
    nevoa: [178, 140, 228],
    clareira: [246, 206, 96],
  };

  it('faz a média ponderada das cores', () => {
    const cor = mixColor({ tempestade: 1 }, paleta);
    expect(cor).toEqual([96, 150, 214]);
  });

  it('cor neutra quando a mistura é vazia', () => {
    expect(mixColor({}, paleta)).toEqual([200, 200, 220]);
  });
});
