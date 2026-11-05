import type { Checkin } from '@/domain/tipos';

import { calcularSequencia, diaDoMes, diaLocal, numeroDeDiasNoMes, resumoDoDia, resumoSemana, semanasDoMes } from './dominio';

describe('diaLocal', () => {
  it('formata epoch ms em YYYY-MM-DD no fuso local', () => {
    const d = new Date(2026, 9, 24, 23, 59); // 24/out/2026 23:59 local
    expect(diaLocal(d.getTime())).toBe('2026-10-24');
  });

  it('usa zero à esquerda em mês/dia de um dígito', () => {
    const d = new Date(2026, 0, 5, 12, 0);
    expect(diaLocal(d.getTime())).toBe('2026-01-05');
  });
});

describe('calcularSequencia', () => {
  function c(clima: Checkin['clima'], em: number) {
    return { clima, em };
  }

  it('zero quando o mais recente já é clareira', () => {
    expect(calcularSequencia([c('clareira', 3), c('tempestade', 2), c('nevoa', 1)])).toBe(0);
  });

  it('conta tempestade/névoa seguidos até a primeira clareira', () => {
    expect(
      calcularSequencia([c('tempestade', 5), c('nevoa', 4), c('tempestade', 3), c('clareira', 2), c('nevoa', 1)]),
    ).toBe(3);
  });

  it('conta tudo se nunca houve clareira no histórico', () => {
    expect(calcularSequencia([c('tempestade', 3), c('nevoa', 2), c('tempestade', 1)])).toBe(3);
  });

  it('zero para histórico vazio', () => {
    expect(calcularSequencia([])).toBe(0);
  });

  it('zera a sequência em check-ins anteriores a um compartilhamento com Porto Seguro', () => {
    const checkins = [c('tempestade', 5), c('nevoa', 4), c('tempestade', 3), c('nevoa', 2), c('tempestade', 1)];
    expect(calcularSequencia(checkins, 3)).toBe(2);
  });

  it('ignora o Porto Seguro se ele foi antes de todos os check-ins considerados', () => {
    const checkins = [c('tempestade', 5), c('nevoa', 4)];
    expect(calcularSequencia(checkins, 1)).toBe(2);
  });
});

describe('resumoDoDia', () => {
  function checkin(parcial: Partial<Checkin>): Checkin {
    return {
      id: 'x',
      em: 0,
      clima: 'nevoa',
      mistura: { tempestade: 0, nevoa: 100, clareira: 0 },
      respostas: [],
      etiquetas: [],
      ...parcial,
    };
  }

  it('retorna null sem check-ins no dia', () => {
    expect(resumoDoDia('2026-10-24', [], false)).toBeNull();
  });

  it('calcula contagem, média da mistura, união de etiquetas e clima predominante', () => {
    const checkins = [
      checkin({ mistura: { tempestade: 100, nevoa: 0, clareira: 0 }, etiquetas: ['cansaço'] }),
      checkin({ mistura: { tempestade: 0, nevoa: 0, clareira: 100 }, etiquetas: ['alívio', 'cansaço'] }),
    ];
    const resumo = resumoDoDia('2026-10-24', checkins, true);
    expect(resumo).not.toBeNull();
    expect(resumo?.contagem).toBe(2);
    expect(resumo?.misturaMedia).toEqual({ tempestade: 50, nevoa: 0, clareira: 50 });
    expect([...(resumo?.etiquetas ?? [])].sort()).toEqual(['alívio', 'cansaço']);
    expect(resumo?.portoSeguro).toBe(true);
    expect(resumo?.dia).toBe('2026-10-24');
  });

  it('clima predominante é o de maior peso médio', () => {
    const checkins = [
      checkin({ mistura: { tempestade: 20, nevoa: 70, clareira: 10 } }),
      checkin({ mistura: { tempestade: 10, nevoa: 80, clareira: 10 } }),
    ];
    expect(resumoDoDia('2026-10-24', checkins, false)?.climaPredominante).toBe('nevoa');
  });
});

describe('diaDoMes', () => {
  it('monta YYYY-MM-DD com zero à esquerda', () => {
    expect(diaDoMes(2026, 1, 5)).toBe('2026-01-05');
    expect(diaDoMes(2026, 10, 24)).toBe('2026-10-24');
  });
});

describe('numeroDeDiasNoMes', () => {
  it('conta os dias de meses de 28/30/31 dias', () => {
    expect(numeroDeDiasNoMes(2026, 10)).toBe(31);
    expect(numeroDeDiasNoMes(2026, 11)).toBe(30);
    expect(numeroDeDiasNoMes(2026, 2)).toBe(28);
  });
});

describe('semanasDoMes', () => {
  it('divide outubro/2026 (começa numa quinta) em semanas domingo–sábado, bordas parciais', () => {
    expect(semanasDoMes(2026, 10)).toEqual([
      [1, 3],
      [4, 10],
      [11, 17],
      [18, 24],
      [25, 31],
    ]);
  });

  it('divide fevereiro/2026 (começa num domingo) sem semana parcial no início', () => {
    expect(semanasDoMes(2026, 2)).toEqual([
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
    ]);
  });
});

describe('resumoSemana', () => {
  it('conta o clima predominante de cada dia da semana que tem resumo', () => {
    const resumos: Record<string, { climaPredominante: Checkin['clima'] }> = {
      '2026-10-18': { climaPredominante: 'clareira' },
      '2026-10-19': { climaPredominante: 'clareira' },
      '2026-10-20': { climaPredominante: 'nevoa' },
      // 21-23 sem registro
      '2026-10-24': { climaPredominante: 'tempestade' },
    };
    expect(resumoSemana(resumos, 2026, 10, [18, 24])).toEqual({ tempestade: 1, nevoa: 1, clareira: 2 });
  });

  it('zero em todas quando a semana não tem nenhum registro', () => {
    expect(resumoSemana({}, 2026, 10, [18, 24])).toEqual({ tempestade: 0, nevoa: 0, clareira: 0 });
  });
});
