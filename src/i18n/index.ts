import type { DB } from '@op-engineering/op-sqlite';
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { lerPreferencia, salvarPreferencia } from '@/data/repositorios';

import { idiomaDoCodigoDeIdioma, IDIOMA_PADRAO, ehIdiomaSuportado, type Idioma } from './idioma';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import en from './locales/en/common.json';
import ptBR from './locales/pt-BR/common.json';

// Infra de i18n (ver 02-sdd.md, seção 15). UI estática: i18next + react-i18next, catálogo em
// src/i18n/locales/<idioma>/common.json. Conteúdo dinâmico (frases, perguntas etc.) usa o
// esquema multi-locale à parte — ver textoLocalizado.ts, não este arquivo.

const CHAVE_PREFERENCIA_IDIOMA = 'idioma';

/** `Localization.getLocales()[0].languageCode` → idioma suportado, ou `pt-BR` por padrão. */
export function detectarIdiomaDoAparelho(): Idioma {
  const [primeiro] = getLocales();
  return idiomaDoCodigoDeIdioma(primeiro?.languageCode ?? null);
}

/** Preferência salva tem prioridade sobre a detecção do aparelho (ver seção 15.3). */
export async function obterIdiomaInicial(db: DB): Promise<Idioma> {
  const salvo = await lerPreferencia(db, CHAVE_PREFERENCIA_IDIOMA);
  if (ehIdiomaSuportado(salvo)) return salvo;
  return detectarIdiomaDoAparelho();
}

let iniciado = false;

/** Chamar uma vez, no boot do app, com o resultado de `obterIdiomaInicial`. */
export function iniciarI18n(idiomaInicial: Idioma): Promise<unknown> {
  if (iniciado) return Promise.resolve();
  iniciado = true;
  // eslint-disable-next-line import/no-named-as-default-member -- uso padrão do i18next: .use() na própria instância
  return i18next.use(initReactI18next).init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: idiomaInicial,
    fallbackLng: IDIOMA_PADRAO,
    interpolation: { escapeValue: false },
  });
}

/** Troca em runtime (Ajustes) e persiste a escolha, que passa a valer mais que a detecção. */
export async function trocarIdioma(idioma: Idioma, db: DB): Promise<void> {
  // eslint-disable-next-line import/no-named-as-default-member -- uso padrão do i18next: .changeLanguage() na própria instância
  await i18next.changeLanguage(idioma);
  await salvarPreferencia(db, CHAVE_PREFERENCIA_IDIOMA, idioma);
}

export { IDIOMA_PADRAO, IDIOMAS_SUPORTADOS, type Idioma } from './idioma';
export default i18next;
