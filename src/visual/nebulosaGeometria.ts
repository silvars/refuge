// Geometria e cor puras da Nebulosa (ver 02-sdd.md, seção 7.5) — porta de motor/motor-visual.js
// (RefugioNebulosa). Sem Skia/Reanimated aqui, mesmo motivo de geometria.ts: fácil de testar
// isoladamente, e Nebulosa.tsx consome essas funções dentro de worklets/useFrameCallback.

import type { Mistura } from '@/domain/tipos';

export interface PosicaoEstrela {
  x: number;
  y: number;
}

/** Pseudo-aleatório determinístico por índice — mesma fórmula do protótipo (sem Math.random). */
export function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Posição em espiral do dia `d` (1-indexado) dentro de uma área `largura` × `altura`. */
export function posicaoDoDia(d: number, largura: number, altura: number): PosicaoEstrela {
  const angulo = d * 0.58 + 0.4;
  const raio = 14 + d * 4.5;
  return {
    x: largura / 2 + Math.cos(angulo) * raio + (seeded(d + 200) - 0.5) * 10,
    y: altura / 2 + Math.sin(angulo) * raio * 0.9 + (seeded(d + 300) - 0.5) * 10,
  };
}

const COR_ESTRELA: Record<keyof Mistura, readonly [number, number, number]> = {
  tempestade: [96, 150, 214],
  nevoa: [178, 140, 228],
  clareira: [246, 206, 96],
};

const CLIMAS = Object.keys(COR_ESTRELA) as (keyof Mistura)[];

/** Cor RGB (0–255) da mistura ponderada; cinza-azulado neutro quando a mistura é toda zero. */
export function corDaMistura(mistura: Mistura): readonly [number, number, number] {
  let total = 0;
  const c: [number, number, number] = [0, 0, 0];
  for (const clima of CLIMAS) {
    const peso = mistura[clima] || 0;
    total += peso;
    const cor = COR_ESTRELA[clima];
    c[0] += cor[0] * peso;
    c[1] += cor[1] * peso;
    c[2] += cor[2] * peso;
  }
  if (!total) return [200, 200, 220];
  return [Math.round(c[0] / total), Math.round(c[1] / total), Math.round(c[2] / total)];
}

/** Dia mais próximo de um toque (coordenadas locais ao card, em px), dentro do raio de 26 px. */
export function diaMaisProximo(x: number, y: number, ultimoDia: number, largura: number, altura: number): number | null {
  let melhorDia: number | null = null;
  let melhorDistancia = 26;
  for (let d = 1; d <= ultimoDia; d++) {
    const p = posicaoDoDia(d, largura, altura);
    const distancia = Math.hypot(p.x - x, p.y - y);
    if (distancia < melhorDistancia) {
      melhorDistancia = distancia;
      melhorDia = d;
    }
  }
  return melhorDia;
}
