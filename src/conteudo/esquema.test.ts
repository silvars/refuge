import { mesmoFormato } from './esquema';

describe('mesmoFormato', () => {
  const bundled = { versao: '2.0', idiomas: ['pt-BR'], estados: {} };

  it('verdadeiro quando o candidato tem as mesmas chaves e versao é string', () => {
    const candidato = { versao: '2.1', idiomas: ['pt-BR', 'en'], estados: { x: 1 } };
    expect(mesmoFormato(bundled, candidato)).toBe(true);
  });

  it('falso quando falta uma chave de nível raiz', () => {
    const candidato = { versao: '2.1', idiomas: [] };
    expect(mesmoFormato(bundled, candidato)).toBe(false);
  });

  it('falso quando tem uma chave extra inesperada', () => {
    const candidato = { versao: '2.1', idiomas: [], estados: {}, extra: true };
    expect(mesmoFormato(bundled, candidato)).toBe(false);
  });

  it('falso quando versao não é string', () => {
    const candidato = { versao: 2.1, idiomas: [], estados: {} };
    expect(mesmoFormato(bundled, candidato)).toBe(false);
  });

  it('falso para null, array ou tipos primitivos', () => {
    expect(mesmoFormato(bundled, null)).toBe(false);
    expect(mesmoFormato(bundled, [])).toBe(false);
    expect(mesmoFormato(bundled, 'texto')).toBe(false);
    expect(mesmoFormato(bundled, 42)).toBe(false);
  });
});
