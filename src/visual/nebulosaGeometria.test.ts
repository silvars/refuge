import { corDaMistura, diaMaisProximo, posicaoDoDia, seeded } from './nebulosaGeometria';

describe('seeded', () => {
  it('é determinístico e cai em [0, 1)', () => {
    expect(seeded(1)).toBeCloseTo(0.9216903898159217);
    expect(seeded(5)).toBeCloseTo(0.4534795162107912);
    expect(seeded(1)).toBe(seeded(1));
  });
});

describe('posicaoDoDia', () => {
  it('reproduz a espiral do protótipo (motor-visual.js RefugioNebulosa.pos)', () => {
    const p1 = posicaoDoDia(1, 342, 330);
    expect(p1.x).toBeCloseTo(178.0411818944402);
    expect(p1.y).toBeCloseTo(176.83467356151021);

    const p24 = posicaoDoDia(24, 342, 330);
    expect(p24.x).toBeCloseTo(148.5953450079509);
    expect(p24.y).toBeCloseTo(273.9344363583067);
  });

  it('dias diferentes caem em posições diferentes (espiral, não sobrepõe)', () => {
    const p1 = posicaoDoDia(1, 342, 330);
    const p2 = posicaoDoDia(2, 342, 330);
    expect(p1).not.toEqual(p2);
  });
});

describe('corDaMistura', () => {
  it('cor pura de cada clima quando a mistura é 100% dele', () => {
    expect(corDaMistura({ tempestade: 100, nevoa: 0, clareira: 0 })).toEqual([96, 150, 214]);
    expect(corDaMistura({ tempestade: 0, nevoa: 0, clareira: 100 })).toEqual([246, 206, 96]);
  });

  it('média ponderada entre dois climas', () => {
    expect(corDaMistura({ tempestade: 50, nevoa: 50, clareira: 0 })).toEqual([137, 145, 221]);
  });

  it('cinza-azulado neutro quando a mistura é toda zero (dia sem registro)', () => {
    expect(corDaMistura({ tempestade: 0, nevoa: 0, clareira: 0 })).toEqual([200, 200, 220]);
  });
});

describe('diaMaisProximo', () => {
  it('acha o dia cujo centro está dentro do raio de 26 px', () => {
    const alvo = posicaoDoDia(24, 342, 330);
    expect(diaMaisProximo(alvo.x, alvo.y, 24, 342, 330)).toBe(24);
  });

  it('null quando nenhum dia está dentro do raio', () => {
    expect(diaMaisProximo(-1000, -1000, 24, 342, 330)).toBeNull();
  });

  it('null quando o toque é além do último dia considerado (ex. dia futuro no mês)', () => {
    const alvo = posicaoDoDia(28, 342, 330);
    expect(diaMaisProximo(alvo.x, alvo.y, 24, 342, 330)).toBeNull();
  });
});
