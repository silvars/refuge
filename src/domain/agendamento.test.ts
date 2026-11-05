import {
  ajustarForaDoSilencio,
  calcularHorarioApoio,
  calcularLembrete,
  dentroDoSilencio,
  podeAgendarMais,
  type JanelaSilencio,
} from './agendamento';

const SILENCIO_PADRAO: JanelaSilencio = { inicio: '22:00', fim: '08:00' };

describe('dentroDoSilencio', () => {
  it('true de madrugada e à noite, dentro da janela que cruza a meia-noite', () => {
    expect(dentroDoSilencio(new Date(2026, 9, 24, 23, 0).getTime(), SILENCIO_PADRAO)).toBe(true);
    expect(dentroDoSilencio(new Date(2026, 9, 24, 3, 0).getTime(), SILENCIO_PADRAO)).toBe(true);
  });

  it('false durante o dia, e no limite exato do fim (exclusivo)', () => {
    expect(dentroDoSilencio(new Date(2026, 9, 24, 10, 0).getTime(), SILENCIO_PADRAO)).toBe(false);
    expect(dentroDoSilencio(new Date(2026, 9, 24, 8, 0).getTime(), SILENCIO_PADRAO)).toBe(false);
    expect(dentroDoSilencio(new Date(2026, 9, 24, 21, 59).getTime(), SILENCIO_PADRAO)).toBe(false);
  });

  it('janela que não cruza a meia-noite (ex. 01:00–02:00)', () => {
    const silencio: JanelaSilencio = { inicio: '01:00', fim: '02:00' };
    expect(dentroDoSilencio(new Date(2026, 9, 24, 1, 30).getTime(), silencio)).toBe(true);
    expect(dentroDoSilencio(new Date(2026, 9, 24, 2, 0).getTime(), silencio)).toBe(false);
    expect(dentroDoSilencio(new Date(2026, 9, 24, 0, 30).getTime(), silencio)).toBe(false);
  });

  it('janela degenerada (início == fim) nunca é silêncio', () => {
    expect(dentroDoSilencio(new Date(2026, 9, 24, 23, 0).getTime(), { inicio: '00:00', fim: '00:00' })).toBe(false);
  });
});

describe('ajustarForaDoSilencio', () => {
  it('não mexe em horário fora do silêncio', () => {
    const momento = new Date(2026, 9, 24, 14, 0).getTime();
    expect(ajustarForaDoSilencio(momento, SILENCIO_PADRAO)).toBe(momento);
  });

  it('empurra pro fim da janela no mesmo dia, se o fim ainda não passou', () => {
    const meiaNoite = new Date(2026, 9, 24, 0, 0).getTime();
    const ajustado = new Date(ajustarForaDoSilencio(meiaNoite, SILENCIO_PADRAO));
    expect(ajustado).toEqual(new Date(2026, 9, 24, 8, 0));
  });

  it('empurra pro fim da janela no dia seguinte, se o fim já passou', () => {
    const vinteEDuasHoras = new Date(2026, 9, 24, 22, 0).getTime();
    const ajustado = new Date(ajustarForaDoSilencio(vinteEDuasHoras, SILENCIO_PADRAO));
    expect(ajustado).toEqual(new Date(2026, 9, 25, 8, 0));
  });
});

describe('calcularLembrete', () => {
  it('sorteia entre +4h e +12h após o check-in (sem cair no silêncio)', () => {
    const checkinEm = new Date(2026, 9, 24, 10, 0).getTime();
    expect(new Date(calcularLembrete(checkinEm, SILENCIO_PADRAO, () => 0))).toEqual(new Date(2026, 9, 24, 14, 0));
    expect(new Date(calcularLembrete(checkinEm, SILENCIO_PADRAO, () => 0.5))).toEqual(new Date(2026, 9, 24, 18, 0));
  });

  it('se o sorteio cair no silêncio, empurra pro fim da janela', () => {
    // checkin às 10:00 + 12h = 22:00, exatamente o início do silêncio padrão.
    const checkinEm = new Date(2026, 9, 24, 10, 0).getTime();
    expect(new Date(calcularLembrete(checkinEm, SILENCIO_PADRAO, () => 1))).toEqual(new Date(2026, 9, 25, 8, 0));
  });
});

describe('podeAgendarMais', () => {
  it('permite até o teto de 2 notificações por dia', () => {
    expect(podeAgendarMais(0)).toBe(true);
    expect(podeAgendarMais(1)).toBe(true);
    expect(podeAgendarMais(2)).toBe(false);
    expect(podeAgendarMais(3)).toBe(false);
  });
});

describe('calcularHorarioApoio', () => {
  const dataBase = new Date(2026, 9, 24, 0, 0);

  it('janela da manhã (9h–11h)', () => {
    expect(new Date(calcularHorarioApoio(dataBase, 'manha', SILENCIO_PADRAO, () => 0))).toEqual(new Date(2026, 9, 24, 9, 0));
    expect(new Date(calcularHorarioApoio(dataBase, 'manha', SILENCIO_PADRAO, () => 0.5))).toEqual(new Date(2026, 9, 24, 10, 0));
  });

  it('janela da tarde (17h–19h)', () => {
    expect(new Date(calcularHorarioApoio(dataBase, 'noite', SILENCIO_PADRAO, () => 0))).toEqual(new Date(2026, 9, 24, 17, 0));
  });
});
