// Tokens de cor, tipografia e vidro — ver especificação, seção 8.

/** Paleta de texto/vidro por modo. Escuro: Tempestade/Névoa. Claro: Clareira ≥ 55% na mistura. */
export const CORES = {
  escuro: {
    tinta: '#FCFCFC',
    tintaSecundaria: 'rgba(252,252,252,0.86)',
    vidro: 'rgba(252,252,252,0.10)',
    vidroForte: 'rgba(252,252,252,0.18)',
    vidroInterno: 'rgba(0,0,0,0.14)',
    fio: 'rgba(252,252,252,0.36)',
  },
  claro: {
    tinta: '#231F20',
    tintaSecundaria: '#3E3A36',
    vidro: 'rgba(255,255,255,0.38)',
    vidroForte: 'rgba(255,255,255,0.55)',
    vidroInterno: 'rgba(255,255,255,0.5)',
    fio: 'rgba(35,31,32,0.22)',
  },
} as const;

export type TokensDeCor = {
  tinta: string;
  tintaSecundaria: string;
  vidro: string;
  vidroForte: string;
  vidroInterno: string;
  fio: string;
};

export const DESFOQUE_VIDRO = 14;
export const RAIO_BOTAO = 999;
export const RAIO_CARD = 20;
export const ALTURA_BOTAO = 52;

/** Cor de estrela na Nebulosa, por clima dominante do dia — ver especificação, seção F9. */
export const CORES_ESTRELA = {
  tempestade: '#6096D6',
  nevoa: '#B28CE4',
  clareira: '#F6CE60',
} as const;

export const COR_AJUDA = '#E71A3B';

/** Claro quando a fração de Clareira na mistura atinge o limiar da especificação (seção 8.1). */
export function ehModoClaro(fracaoClareira: number): boolean {
  return fracaoClareira >= 0.55;
}

export function tokensParaMistura(fracaoClareira: number): TokensDeCor {
  return ehModoClaro(fracaoClareira) ? CORES.claro : CORES.escuro;
}

const FAMILIA_TITULO = 'Urbanist_300Light';
const FAMILIA_TITULO_DESTAQUE = 'Urbanist_500Medium';
const FAMILIA_TEXTO = 'Roboto_400Regular';

/** Estilos de texto prontos (fontFamily + fontSize + letterSpacing/lineHeight) — seção 8.2. */
export const TIPOGRAFIA = {
  nomeClima: { fontFamily: FAMILIA_TITULO, fontSize: 44, letterSpacing: 0.2 },
  tituloTela: { fontFamily: FAMILIA_TITULO, fontSize: 29, letterSpacing: 0.2 },
  destaque: { fontFamily: FAMILIA_TITULO_DESTAQUE, fontSize: 18, letterSpacing: 0.2 },
  corpo: { fontFamily: FAMILIA_TEXTO, fontSize: 15.5, lineHeight: 23 },
  rotulo: { fontFamily: FAMILIA_TEXTO, fontSize: 13 },
} as const;
