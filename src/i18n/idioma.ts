// Idioma suportado (ver especificação, seção 16; 02-sdd.md, seção 15).

export type Idioma = 'pt-BR' | 'en' | 'fr' | 'es';

export const IDIOMA_PADRAO: Idioma = 'pt-BR';
export const IDIOMAS_SUPORTADOS: readonly Idioma[] = ['pt-BR', 'en', 'fr', 'es'];

export function ehIdiomaSuportado(valor: string | null | undefined): valor is Idioma {
  return IDIOMAS_SUPORTADOS.includes(valor as Idioma);
}

/**
 * Mapeia o `languageCode` do aparelho (ex. `expo-localization`) pro idioma suportado mais
 * próximo; `pt-BR` se não for nenhum dos 4 (ver especificação, seção 16.2).
 */
export function idiomaDoCodigoDeIdioma(languageCode: string | null | undefined): Idioma {
  switch (languageCode) {
    case 'pt':
      return 'pt-BR';
    case 'en':
    case 'fr':
    case 'es':
      return languageCode;
    default:
      return IDIOMA_PADRAO;
  }
}
