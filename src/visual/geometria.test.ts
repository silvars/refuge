import { pontosDoAngulo } from './geometria';

describe('pontosDoAngulo', () => {
  it('0° aponta de baixo para cima, centralizado horizontalmente', () => {
    const { inicio, fim } = pontosDoAngulo(0, 100, 200);
    expect(inicio).toEqual({ x: 50, y: 200 });
    expect(fim).toEqual({ x: 50, y: 0 });
  });

  it('90° aponta da esquerda para a direita, centralizado verticalmente', () => {
    const { inicio, fim } = pontosDoAngulo(90, 100, 200);
    expect(inicio.x).toBeCloseTo(0);
    expect(inicio.y).toBeCloseTo(100);
    expect(fim.x).toBeCloseTo(100);
    expect(fim.y).toBeCloseTo(100);
  });

  it('180° aponta de cima para baixo', () => {
    const { inicio, fim } = pontosDoAngulo(180, 100, 200);
    expect(inicio.x).toBeCloseTo(50);
    expect(inicio.y).toBeCloseTo(0);
    expect(fim.x).toBeCloseTo(50);
    expect(fim.y).toBeCloseTo(200);
  });

  it('a linha é simétrica em torno do centro da caixa', () => {
    const { inicio, fim } = pontosDoAngulo(165, 390, 844);
    expect(inicio.x + fim.x).toBeCloseTo(390);
    expect(inicio.y + fim.y).toBeCloseTo(844);
  });

  it('o comprimento da linha cobre a caixa inteira (nenhuma parada fica de fora)', () => {
    const largura = 390;
    const altura = 844;
    const { inicio, fim } = pontosDoAngulo(165, largura, altura);
    const comprimento = Math.hypot(fim.x - inicio.x, fim.y - inicio.y);
    // Para qualquer ângulo, o comprimento mínimo pra cobrir a caixa é a diagonal projetada;
    // conferimos que é pelo menos tão grande quanto o maior lado.
    expect(comprimento).toBeGreaterThanOrEqual(Math.max(largura, altura) - 1e-6);
  });
});
