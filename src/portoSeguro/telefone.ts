// Normalização de telefone pro fluxo de Porto Seguro (ver especificação, seção 11).

import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normaliza um telefone bruto (como vem do seletor de contatos) pro formato E.164.
 * Retorna `null` se não for possível interpretar como um número válido.
 */
export function normalizarTelefone(bruto: string, paisPadrao: CountryCode = 'BR'): string | null {
  const numero = parsePhoneNumberFromString(bruto, paisPadrao);
  if (!numero || !numero.isValid()) return null;
  return numero.number;
}
