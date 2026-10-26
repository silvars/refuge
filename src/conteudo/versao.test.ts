import { compararVersoes } from './versao';

describe('compararVersoes', () => {
  it('positivo quando a primeira é mais nova', () => {
    expect(compararVersoes('2.1', '2.0')).toBeGreaterThan(0);
  });

  it('negativo quando a primeira é mais antiga', () => {
    expect(compararVersoes('2.0', '2.1')).toBeLessThan(0);
  });

  it('zero quando são iguais', () => {
    expect(compararVersoes('2.0', '2.0')).toBe(0);
  });

  it('compara numericamente, não lexicograficamente (2.10 > 2.9)', () => {
    expect(compararVersoes('2.10', '2.9')).toBeGreaterThan(0);
  });

  it('trata segmentos faltando como zero', () => {
    expect(compararVersoes('2', '2.0')).toBe(0);
    expect(compararVersoes('2.1', '2')).toBeGreaterThan(0);
  });
});
