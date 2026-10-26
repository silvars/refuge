import { ehIdiomaSuportado, idiomaDoCodigoDeIdioma } from './idioma';

describe('idiomaDoCodigoDeIdioma', () => {
  it('mapeia pt para pt-BR', () => {
    expect(idiomaDoCodigoDeIdioma('pt')).toBe('pt-BR');
  });

  it('mantém en/fr/es como estão', () => {
    expect(idiomaDoCodigoDeIdioma('en')).toBe('en');
    expect(idiomaDoCodigoDeIdioma('fr')).toBe('fr');
    expect(idiomaDoCodigoDeIdioma('es')).toBe('es');
  });

  it('cai para pt-BR em qualquer outro idioma (ou nulo/indefinido)', () => {
    expect(idiomaDoCodigoDeIdioma('de')).toBe('pt-BR');
    expect(idiomaDoCodigoDeIdioma(null)).toBe('pt-BR');
    expect(idiomaDoCodigoDeIdioma(undefined)).toBe('pt-BR');
  });
});

describe('ehIdiomaSuportado', () => {
  it('verdadeiro para os 4 idiomas suportados', () => {
    expect(ehIdiomaSuportado('pt-BR')).toBe(true);
    expect(ehIdiomaSuportado('en')).toBe(true);
    expect(ehIdiomaSuportado('fr')).toBe(true);
    expect(ehIdiomaSuportado('es')).toBe(true);
  });

  it('falso para outros valores, nulo, indefinido ou string vazia', () => {
    expect(ehIdiomaSuportado('pt')).toBe(false);
    expect(ehIdiomaSuportado('de')).toBe(false);
    expect(ehIdiomaSuportado(null)).toBe(false);
    expect(ehIdiomaSuportado(undefined)).toBe(false);
    expect(ehIdiomaSuportado('')).toBe(false);
  });
});
