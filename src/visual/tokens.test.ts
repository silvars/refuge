import { CORES, ehModoClaro, tokensParaMistura } from './tokens';

describe('ehModoClaro', () => {
  it('é falso abaixo do limiar de 55% de Clareira', () => {
    expect(ehModoClaro(0)).toBe(false);
    expect(ehModoClaro(0.3)).toBe(false);
    expect(ehModoClaro(0.549)).toBe(false);
  });

  it('é verdadeiro a partir de 55% de Clareira (inclusive)', () => {
    expect(ehModoClaro(0.55)).toBe(true);
    expect(ehModoClaro(0.8)).toBe(true);
    expect(ehModoClaro(1)).toBe(true);
  });
});

describe('tokensParaMistura', () => {
  it('retorna os tokens escuros abaixo do limiar', () => {
    expect(tokensParaMistura(0.2)).toBe(CORES.escuro);
  });

  it('retorna os tokens claros no limiar e acima', () => {
    expect(tokensParaMistura(0.55)).toBe(CORES.claro);
    expect(tokensParaMistura(0.9)).toBe(CORES.claro);
  });
});
