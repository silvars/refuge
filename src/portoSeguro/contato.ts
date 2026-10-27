// Seletor de contato nativo pro fluxo de Porto Seguro (ver especificação, seção 11).
//
// `Contact.presentPicker()` é a API atual do expo-contacts (SDK 58+); os métodos antigos
// `Contacts.presentContactPickerAsync()` etc. foram descontinuados e agora lançam em runtime.

import { Contact, ContactField } from 'expo-contacts';

import { normalizarTelefone } from './telefone';

export interface ContatoEscolhido {
  readonly primeiroNome: string;
  readonly e164: string;
}

/** Rótulos (em qualquer um dos 4 idiomas do app) que indicam um número de celular. */
const ROTULOS_CELULAR = ['mobile', 'celular', 'cell', 'cellulaire', 'portable', 'móvil', 'celular'];

/** Abre o seletor nativo e devolve o primeiro nome + telefone normalizado, preferindo celular. */
export async function escolherContato(): Promise<ContatoEscolhido | null> {
  const contato = await Contact.presentPicker();
  if (!contato) return null;

  const detalhes = await contato.getDetails([ContactField.GIVEN_NAME, ContactField.PHONES]);
  const telefones = detalhes.phones ?? [];
  if (telefones.length === 0) return null;

  const celular = telefones.find((t) => ROTULOS_CELULAR.includes((t.label ?? '').toLowerCase()));
  const escolhido = celular ?? telefones[0];
  if (!escolhido.number) return null;

  const e164 = normalizarTelefone(escolhido.number);
  if (!e164) return null;

  return { primeiroNome: detalhes.givenName ?? '', e164 };
}
