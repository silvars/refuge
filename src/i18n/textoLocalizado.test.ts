import { textoLocalizado } from './textoLocalizado';

describe('textoLocalizado', () => {
  const campo = { 'pt-BR': 'Olá', en: 'Hello', fr: null, es: null };

  it('retorna o texto do idioma ativo quando existe', () => {
    expect(textoLocalizado(campo, 'en')).toBe('Hello');
  });

  it('cai pro idioma de origem (pt-BR por padrão) quando o idioma ativo é null', () => {
    expect(textoLocalizado(campo, 'fr')).toBe('Olá');
    expect(textoLocalizado(campo, 'es')).toBe('Olá');
  });

  it('aceita um idioma de origem diferente do padrão', () => {
    const campoComOrigemEn = { 'pt-BR': null, en: 'Hello', fr: null, es: null };
    expect(textoLocalizado(campoComOrigemEn, 'fr', 'en')).toBe('Hello');
  });

  it('retorna string vazia se nem o idioma ativo nem o de origem têm texto', () => {
    const campoVazio = { 'pt-BR': null, en: null, fr: null, es: null };
    expect(textoLocalizado(campoVazio, 'fr')).toBe('');
  });
});
