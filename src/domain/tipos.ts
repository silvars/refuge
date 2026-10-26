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

/** Sessão de check-in em andamento, em memória (ver 02-sdd.md, seção 4). */
export interface SessaoCheckin {
  readonly id: string;
  readonly iniciadoEm: number;
  /** Índices embaralhados por pergunta — fixos durante toda a sessão. */
  readonly ordens: readonly (readonly number[])[];
  /** Índice ORIGINAL da opção escolhida em cada pergunta; `null` = ainda sem resposta. */
  readonly respostas: readonly (number | null)[];
  readonly pausaFeita: boolean;
  readonly climaAnterior: Clima | null;
}

/** Um check-in persistido (ver 02-sdd.md, seção 4 e seção 5 — tabela `checkin`). */
export interface Checkin {
  readonly id: string;
  readonly em: number;
  readonly clima: Clima;
  readonly mistura: Mistura;
  readonly respostas: readonly { perguntaId: string; opcaoId: string }[];
  readonly etiquetas: readonly string[];
}

export interface Preferencias {
  linhas: { neutra: boolean; espiritual: boolean; filosofica: boolean };
  som: boolean;
  vibracao: boolean;
  lembretes: boolean;
  /** Padrão `false` — opt-in explícito (ver especificação, seção F12). */
  mensagensApoio: boolean;
  bloqueio: boolean;
  silencio: { inicio: string; fim: string };
  onboardingFeito: boolean;
}

export interface EstadoDerivado {
  climaAtual: Clima | null;
  misturaAtual: Mistura | null;
  /** Check-ins seguidos em Tempestade/Névoa (ver clima.nextStreak/shouldSuggestPorto). */
  sequencia: number;
  ultimoCheckinEm: number | null;
  /** `agora - ultimoCheckinEm > 12h` (ver clima.isStale). */
  esmaecido: boolean;
}

/** Resumo de um dia para a Nebulosa (ver especificação, seção F9; 02-sdd.md, seção 5). */
export interface ResumoDia {
  readonly dia: string;
  readonly contagem: number;
  readonly climaPredominante: Clima | null;
  readonly misturaMedia: Mistura;
  readonly etiquetas: readonly string[];
  readonly portoSeguro: boolean;
}
