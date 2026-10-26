// Porta de motor/motor-clima.js — mantém a matemática exata (ver 02-sdd.md, seção 6).
// Regra de ouro: em caso de dúvida de comportamento, motor/motor-clima.js é a referência.

import type { Clima, LayerOpacities, Mistura, Pesos, PerguntaPeso, ResultadoCheckin } from './tipos';

export const KEYS: readonly Clima[] = ['tempestade', 'nevoa', 'clareira'];

/** Peso do clima anterior somado às respostas durante o check-in (a cor parte de onde estava). */
export const PRIOR_WEIGHT = 1.5;
/** Horas sem check-in até a cor esmaecer e o app sugerir novo check-in. */
export const STALE_HOURS = 12;
/** Check-ins seguidos em Tempestade/Névoa até sugerir o Porto Seguro. */
export const STREAK_SUGGEST = 3;

export function zero(): Pesos {
  return { tempestade: 0, nevoa: 0, clareira: 0 };
}

/**
 * Soma os pesos das opções escolhidas.
 * `answers[i]` é o índice ORIGINAL da opção (não o embaralhado); `null`/`undefined` = ainda sem resposta.
 */
export function totals(
  questions: readonly PerguntaPeso[],
  answers: readonly (number | null | undefined)[],
  priorMood: Clima | null,
): Pesos {
  const t = zero();
  if (priorMood) t[priorMood] += PRIOR_WEIGHT;
  answers.forEach((a, i) => {
    if (a === undefined || a === null) return;
    const w = questions[i].opcoes[a].pesos;
    KEYS.forEach((k) => {
      t[k] += w[k] ?? 0;
    });
  });
  return t;
}

/** Normaliza para frações que somam 1 (ou `null` se tudo zero). */
export function normalize(w: Pesos): Pesos | null {
  const s = w.tempestade + w.nevoa + w.clareira;
  if (s <= 0) return null;
  return { tempestade: w.tempestade / s, nevoa: w.nevoa / s, clareira: w.clareira / s };
}

/**
 * Opacidades das 3 camadas de degradê empilhadas (tempestade embaixo, névoa no meio, clareira em cima)
 * para que a composição alfa resulte exatamente na média ponderada. Neutro sempre por baixo de tudo.
 */
export function layerOpacities(w: Pesos): LayerOpacities {
  'worklet';
  const n = normalize(w);
  if (!n) return { neutro: 1, tempestade: 0, nevoa: 0, clareira: 0, wc: 0 };
  const rest = 1 - n.clareira;
  return {
    neutro: 1,
    tempestade: 1,
    nevoa: rest > 0.001 ? Math.min(1, n.nevoa / rest) : 0,
    clareira: n.clareira,
    wc: n.clareira,
  };
}

/** Texto escuro quando a Clareira passa de 55% da mistura (fundo claro) e o app não está esmaecido. */
export function isLight(w: Pesos, stale: boolean): boolean {
  'worklet';
  const n = normalize(w);
  return !!n && n.clareira >= 0.55 && !stale;
}

/**
 * Fecha o check-in: clima predominante + mistura em %.
 * Desempate: vence o estado com maior peso na resposta mais recente entre os climas empatados no topo.
 */
export function finish(questions: readonly PerguntaPeso[], answers: readonly number[]): ResultadoCheckin {
  const c = totals(questions, answers, null);
  const max = Math.max(c.tempestade, c.nevoa, c.clareira);
  let mood: Clima = 'clareira';
  for (let i = answers.length - 1; i >= 0; i--) {
    const w = questions[i].opcoes[answers[i]].pesos;
    let top: Clima | null = null;
    let best = -1;
    KEYS.forEach((k) => {
      const peso = w[k] ?? 0;
      if (peso > best && Math.abs(c[k] - max) < 1e-6) {
        best = peso;
        top = k;
      }
    });
    if (top && best > 0) {
      mood = top;
      break;
    }
  }
  const sum = c.tempestade + c.nevoa + c.clareira;
  const mix = {} as Mistura;
  KEYS.forEach((k) => {
    mix[k] = Math.round((100 * c[k]) / sum);
  });
  return { mood, mix };
}

/** Estado predominante numa mistura parcial (usado para escolher a pausa de respiração). */
export function dominant(w: Pesos): Clima | null {
  let top: Clima | null = null;
  let best = -1;
  KEYS.forEach((k) => {
    if (w[k] > best) {
      best = w[k];
      top = k;
    }
  });
  return best > 0 ? top : null;
}

export function nextStreak(prevStreak: number, mood: Clima): number {
  return mood === 'clareira' ? 0 : prevStreak + 1;
}

export function shouldSuggestPorto(streak: number): boolean {
  return streak >= STREAK_SUGGEST;
}

export function isStale(lastCheckinAt: number | null, now: number): boolean {
  return !!lastCheckinAt && now - lastCheckinAt > STALE_HOURS * 3600 * 1000;
}

/** Embaralha os índices das opções de cada pergunta (uma vez por check-in, estável durante a sessão). */
export function shuffleOrders(questions: readonly PerguntaPeso[], rnd: () => number = Math.random): number[][] {
  return questions.map((q) => {
    const o = q.opcoes.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  });
}

/** Mistura cores RGB pelos pesos (estrelas da Nebulosa). */
export function mixColor(mix: Partial<Mistura>, palette: Record<Clima, readonly [number, number, number]>): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0];
  let t = 0;
  KEYS.forEach((k) => {
    const w = mix[k] ?? 0;
    t += w;
    for (let i = 0; i < 3; i++) c[i] += palette[k][i] * w;
  });
  if (!t) return [200, 200, 220];
  return [Math.round(c[0] / t), Math.round(c[1] / t), Math.round(c[2] / t)];
}
