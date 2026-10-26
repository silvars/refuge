// Comparação de versões "major.minor" (ex. "2.0", "2.1") — ver conteudo/*.json, campo `versao`.

/** > 0 se `a` for mais nova que `b`, < 0 se mais antiga, 0 se igual. Compara numericamente
 * segmento a segmento (não lexicograficamente — "2.10" é mais nova que "2.9"). */
export function compararVersoes(a: string, b: string): number {
  const partesA = a.split('.').map(Number);
  const partesB = b.split('.').map(Number);
  const tamanho = Math.max(partesA.length, partesB.length);
  for (let i = 0; i < tamanho; i++) {
    const na = partesA[i] ?? 0;
    const nb = partesB[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
