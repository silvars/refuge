import type { Idioma } from './idioma';

/** Resolve um campo multi-locale (`{"pt-BR": "...", "en": null, ...}`) com fallback pro idioma de origem. */
export function textoLocalizado<T extends Record<string, string | null>>(
  campo: T,
  idioma: Idioma,
  idiomaOrigem: Idioma = 'pt-BR',
): string {
  return campo[idioma] ?? campo[idiomaOrigem] ?? '';
}
