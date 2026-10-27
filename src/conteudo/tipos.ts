// Esquemas de conteudo/*.json tipados (ver 02-sdd.md, seção 15.1 — campos multi-locale).

import type { Clima } from '@/domain/tipos';
import type { Idioma } from '@/i18n/idioma';

/** Campo multi-locale: `null` = tradução pendente (nunca string vazia). */
export type TextoLocalizado = Record<Idioma, string | null>;

export interface OpcaoPergunta {
  readonly id: string;
  readonly texto: TextoLocalizado;
  readonly pesos: Partial<Record<Clima, number>>;
}

export interface Pergunta {
  readonly id: string;
  readonly dimensao: TextoLocalizado;
  readonly texto: TextoLocalizado;
  readonly opcoes: readonly OpcaoPergunta[];
}

export interface ConteudoPerguntas {
  readonly versao: string;
  readonly pausa_apos_indice: number;
  readonly embaralhar_opcoes: boolean;
  readonly perguntas: readonly Pergunta[];
}

export interface FormaPausa {
  readonly amplitude: number;
  readonly velocidade: number;
  readonly rotacao: number;
  readonly escala_min: number;
  readonly escala_max: number;
}

export interface PausaRespiracaoConteudo {
  readonly nome: TextoLocalizado;
  readonly titulo: TextoLocalizado;
  readonly inspira_s: number;
  readonly expira_s: number;
  readonly rotulo_inspira: TextoLocalizado;
  readonly rotulo_expira: TextoLocalizado;
  readonly apoio: TextoLocalizado;
  readonly forma: FormaPausa;
}

export interface ConteudoRespiracao {
  readonly versao: string;
  readonly pausas: Record<Clima, PausaRespiracaoConteudo>;
}

export type OpcaoEtiqueta = { readonly id: string } & TextoLocalizado;

export interface ConteudoEtiquetas {
  readonly versao: string;
  readonly titulo: TextoLocalizado;
  readonly opcoes: readonly OpcaoEtiqueta[];
}

export type LinhaConteudo = 'neutra' | 'espiritual' | 'filosofica';

export interface Frase {
  readonly id: string;
  readonly linha: LinhaConteudo;
  readonly uso: 'tela' | 'notificacao';
  readonly estados: readonly Clima[];
  readonly momento?: 'qualquer' | 'manha' | 'noite';
  readonly texto: TextoLocalizado;
  readonly nao_repetir_dias?: number;
  readonly ativo: boolean;
}

export interface ConteudoFrases {
  readonly versao: string;
  readonly frases: readonly Frase[];
}

export interface EstadoConteudo {
  readonly nome: TextoLocalizado;
  readonly descricao: TextoLocalizado;
  readonly forma_tela_principal: {
    readonly amplitude: number;
    readonly velocidade: number;
    readonly rotacao: number;
  };
}

export interface ConteudoEstados {
  readonly versao: string;
  readonly estados: Record<Clima, EstadoConteudo>;
}

export type MensagemPortoSeguro = { readonly id: string } & TextoLocalizado;

export interface ConteudoPortoSeguro {
  readonly versao: string;
  readonly mensagens: Record<Clima, readonly MensagemPortoSeguro[]>;
}
