// Tipos de domínio independentes de conteúdo/idioma (ver 02-sdd.md, seção 4).

export type Clima = 'tempestade' | 'nevoa' | 'clareira';

/** Pesos de um clima — sempre as 3 chaves presentes (uso interno do motor). */
export type Pesos = Record<Clima, number>;

/** Mistura final em porcentagens inteiras, somando ~100. */
export type Mistura = Record<Clima, number>;

/** Pesos declarados em conteudo/perguntas.json — nem toda opção tem as 3 chaves. */
export type PesosParciais = Partial<Pesos>;

export interface OpcaoPeso {
  readonly pesos: PesosParciais;
}

export interface PerguntaPeso {
  readonly opcoes: readonly OpcaoPeso[];
}

export interface ResultadoCheckin {
  readonly mood: Clima;
  readonly mix: Mistura;
}

export interface LayerOpacities {
  readonly neutro: number;
  readonly tempestade: number;
  readonly nevoa: number;
  readonly clareira: number;
  readonly wc: number;
}
