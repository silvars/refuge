// Seleção de frases por clima/linha/idioma (ver especificação, seção F5 e F12; 02-sdd.md, seção 12).
// A exclusão por "não repetir dias" depende do banco (frase_exibida) e fica fora daqui — ver
// src/app/checkin/resultado.tsx, que cruza o resultado de `frasesElegiveis` com
// `foiFraseExibidaRecentemente` antes de chamar `escolherFrase`.

import type { Clima } from '@/domain/tipos';
import type { Idioma } from '@/i18n/idioma';

import type { Frase, LinhaConteudo } from './tipos';

export interface CriterioFrase {
  readonly clima: Clima;
  readonly uso: 'tela' | 'notificacao';
  readonly linhasAtivas: readonly LinhaConteudo[];
  readonly idioma: Idioma;
  readonly momento?: 'qualquer' | 'manha' | 'noite';
}

/**
 * Frases ativas que batem com clima/uso/linha, têm texto no idioma ativo (nunca escolhe entrada
 * pendente) e, quando informado, respeitam a janela de `momento` (manhã/noite) da notificação.
 */
export function frasesElegiveis(frases: readonly Frase[], criterio: CriterioFrase): Frase[] {
  return frases.filter(
    (f) =>
      f.ativo &&
      f.uso === criterio.uso &&
      criterio.linhasAtivas.includes(f.linha) &&
      f.estados.includes(criterio.clima) &&
      f.texto[criterio.idioma] !== null &&
      (criterio.momento === undefined || f.momento === undefined || f.momento === 'qualquer' || f.momento === criterio.momento),
  );
}

export function escolherFrase(elegiveis: readonly Frase[], rnd: () => number = Math.random): Frase | null {
  if (elegiveis.length === 0) return null;
  return elegiveis[Math.floor(rnd() * elegiveis.length)];
}
