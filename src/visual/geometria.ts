// Geometria pura, sem Skia/Reanimated — fácil de testar isoladamente (ver FundoClima.tsx).

export interface Ponto2D {
  x: number;
  y: number;
}

/**
 * Converte um ângulo de `linear-gradient` CSS (0° = para cima, sentido horário) nos pontos
 * início/fim de uma linha de gradiente que cobre totalmente uma caixa `largura` × `altura`.
 * Fórmula padrão de conversão CSS-gradiente→coordenadas (ver conteudo/estados.json, campo
 * `angulo_graus`, usado em FundoClima).
 */
export function pontosDoAngulo(anguloGraus: number, largura: number, altura: number): { inicio: Ponto2D; fim: Ponto2D } {
  const theta = ((anguloGraus % 360) * Math.PI) / 180;
  const comprimento = Math.abs(largura * Math.sin(theta)) + Math.abs(altura * Math.cos(theta));
  const dx = Math.sin(theta) * (comprimento / 2);
  const dy = -Math.cos(theta) * (comprimento / 2);
  const cx = largura / 2;
  const cy = altura / 2;
  return { inicio: { x: cx - dx, y: cy - dy }, fim: { x: cx + dx, y: cy + dy } };
}
