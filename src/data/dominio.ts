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

/** Monta o mesmo formato de `diaLocal` a partir de ano/mês (1-indexado)/dia já separados. */
export function diaDoMes(ano: number, mes1Indexado: number, dia: number): string {
  return `${ano}-${String(mes1Indexado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Quantidade de dias no mês (mês 1-indexado, ex. outubro = 10). */
export function numeroDeDiasNoMes(ano: number, mes1Indexado: number): number {
  return new Date(ano, mes1Indexado, 0).getDate();
}

/**
 * Semanas domingo–sábado que cobrem o mês (ver especificação F9, "Nebulosa"): a primeira e a
 * última podem ser parciais. Ex. outubro/2026 (começa numa quinta): [[1,3],[4,10],...,[25,31]].
 */
export function semanasDoMes(ano: number, mes1Indexado: number): readonly (readonly [number, number])[] {
  const numDias = numeroDeDiasNoMes(ano, mes1Indexado);
  const semanas: (readonly [number, number])[] = [];
  let inicio = 1;
  while (inicio <= numDias) {
    const diaDaSemana = new Date(ano, mes1Indexado - 1, inicio).getDay();
    const fim = Math.min(numDias, inicio + (6 - diaDaSemana));
    semanas.push([inicio, fim]);
    inicio = fim + 1;
  }
  return semanas;
}

/** Contagem de dias por clima predominante numa semana — ver especificação F9 "resumo da semana". */
export function resumoSemana(
  resumos: Readonly<Record<string, Pick<ResumoDia, 'climaPredominante'>>>,
  ano: number,
  mes1Indexado: number,
  semana: readonly [number, number],
): Mistura {
  const contagem: Mistura = { tempestade: 0, nevoa: 0, clareira: 0 };
  const [inicio, fim] = semana;
  for (let dia = inicio; dia <= fim; dia++) {
    const clima = resumos[diaDoMes(ano, mes1Indexado, dia)]?.climaPredominante;
    if (clima) contagem[clima]++;
  }
  return contagem;
}

/** Clima de um check-in com seu horário — usado por `calcularSequencia` pra cruzar com Porto Seguro. */
export interface ClimaComHorario {
  readonly clima: Clima;
  readonly em: number;
}

/**
 * Check-ins seguidos em Tempestade/Névoa, olhando o histórico do mais recente pro mais antigo
 * (mesma regra de `clima.nextStreak`: zera em Clareira). `checkinsRecentesPrimeiro` deve vir
 * ordenado por `em DESC`. Compartilhar com um Porto Seguro também zera a sequência (ver
 * especificação F8, item 9): check-ins anteriores a esse compartilhamento não contam mais.
 */
export function calcularSequencia(
  checkinsRecentesPrimeiro: readonly ClimaComHorario[],
  ultimoPortoSeguroEm: number | null = null,
): number {
  let sequencia = 0;
  for (const c of checkinsRecentesPrimeiro) {
    if (ultimoPortoSeguroEm !== null && c.em <= ultimoPortoSeguroEm) break;
    if (c.clima === 'clareira') break;
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
