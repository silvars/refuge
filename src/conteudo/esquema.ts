// Validação estrutural do conteúdo remoto (ver 02-sdd.md, seção 16.2: "validar esquema... nada
// de HTML/script"). Checagem manual, não zod: compara o "formato" (chaves de nível raiz) contra
// o bundled correspondente — captura JSON malformado/incompleto sem manter 6 schemas detalhados
// à mão (o schema real evolui junto com bundled/, sempre publicados juntos).

/** `true` se `candidato` tiver `versao` string e exatamente as mesmas chaves de nível raiz que `bundled`. */
export function mesmoFormato(bundled: unknown, candidato: unknown): boolean {
  if (typeof bundled !== 'object' || bundled === null) return false;
  if (typeof candidato !== 'object' || candidato === null) return false;

  const c = candidato as Record<string, unknown>;
  if (typeof c.versao !== 'string') return false;

  const chavesBundled = Object.keys(bundled).sort();
  const chavesCandidato = Object.keys(c).sort();
  return (
    chavesBundled.length === chavesCandidato.length && chavesBundled.every((chave, i) => chave === chavesCandidato[i])
  );
}
