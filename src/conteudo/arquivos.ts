// Lista de arquivos de conteúdo dinâmico (ver 02-sdd.md, seção 16).
export const ARQUIVOS_CONTEUDO = ['estados', 'etiquetas', 'frases', 'perguntas', 'porto-seguro', 'respiracao'] as const;

export type ArquivoConteudo = (typeof ARQUIVOS_CONTEUDO)[number];
