// Cálculos puros sobre dados do banco (ver 02-sdd.md, seção 5) — sem SQL/op-sqlite aqui de
// propósito: o facade Node do @op-engineering/op-sqlite é ESM-only e não roda sob o Jest deste
// projeto (jest-expo não habilita o flag experimental de VM modules do Node). Então a camada de
// acesso a dados (db.ts/repositorios.ts) fica sem teste automatizado — só manual/E2E (Maestro,
// ver 02-sdd.md seção 2) — e tudo que é lógica pura (e portanto testável) mora aqui.

import { dominant } from '@/domain/clima';
import type { Checkin, Clima, Mistura, ResumoDia } from '@/domain/tipos';

/** Dia no fuso do aparelho, formato 'YYYY-MM-DD' (ver coluna `checkin.dia`). */
export function diaLocal(epochMs: number): string {
  const d = new Date(epochMs);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Check-ins seguidos em Tempestade/Névoa, olhando o histórico do mais recente pro mais antigo
 * (mesma regra de `clima.nextStreak`: zera em Clareira). `climasRecentesPrimeiro` deve vir
 * ordenado por `em DESC`.
 */
export function calcularSequencia(climasRecentesPrimeiro: readonly Clima[]): number {
  let sequencia = 0;
  for (const clima of climasRecentesPrimeiro) {
    if (clima === 'clareira') break;
    sequencia++;
  }
  return sequencia;
}

/** Resumo de um dia (Nebulosa) a partir dos check-ins já filtrados daquele dia. */
export function resumoDoDia(dia: string, checkinsDoDia: readonly Checkin[], portoSeguro: boolean): ResumoDia | null {
  if (checkinsDoDia.length === 0) return null;

  const somaMistura: Mistura = { tempestade: 0, nevoa: 0, clareira: 0 };
  const etiquetas = new Set<string>();
  for (const c of checkinsDoDia) {
    somaMistura.tempestade += c.mistura.tempestade;
    somaMistura.nevoa += c.mistura.nevoa;
    somaMistura.clareira += c.mistura.clareira;
    c.etiquetas.forEach((e) => etiquetas.add(e));
  }
  const n = checkinsDoDia.length;
  const misturaMedia: Mistura = {
    tempestade: somaMistura.tempestade / n,
    nevoa: somaMistura.nevoa / n,
    clareira: somaMistura.clareira / n,
  };

  return {
    dia,
    contagem: n,
    climaPredominante: dominant(misturaMedia),
    misturaMedia,
    etiquetas: [...etiquetas],
    portoSeguro,
  };
}
