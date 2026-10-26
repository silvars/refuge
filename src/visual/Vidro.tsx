import { BackdropBlur, Canvas, Fill, RoundedRect, rect, rrect } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

import { CORES, DESFOQUE_VIDRO, RAIO_CARD } from './tokens';

// Porta do "Vidro" (ver especificação, seção 8.1; 02-sdd.md, seção 7.2): cartão/botão com
// desfoque do que está atrás (BackdropBlur) + tingimento translúcido + fio de 1px.
// Sem Canvas próprio — embuta no Canvas ambiente da tela (ver FundoClima.tsx: dois <Canvas>
// empilhados não compositam direito nesta versão, e o BackdropBlur só enxerga o que foi
// desenhado ANTES dele no MESMO Canvas).

export interface VidroGrupoProps {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Raio dos cantos — 999 (padrão) para pílula de botão, 16–24 para card. */
  raio?: number;
  /** Tingimento translúcido (token de vidro ou vidro forte). */
  cor?: string;
  corFio?: string;
  desfoque?: number;
  /** Fallback para Android de baixo desempenho: só translucidez, sem desfoque (seção 7.2). */
  semDesfoque?: boolean;
}

export function VidroGrupo({
  x,
  y,
  largura,
  altura,
  raio = RAIO_CARD,
  cor = CORES.escuro.vidro,
  corFio = CORES.escuro.fio,
  desfoque = DESFOQUE_VIDRO,
  semDesfoque = false,
}: VidroGrupoProps) {
  const forma = rrect(rect(x, y, largura, altura), raio, raio);

  return (
    <>
      {semDesfoque ? (
        <RoundedRect rect={forma} color={cor} />
      ) : (
        <BackdropBlur blur={desfoque} clip={forma}>
          <Fill color={cor} />
        </BackdropBlur>
      )}
      <RoundedRect rect={forma} color={corFio} style="stroke" strokeWidth={1} />
    </>
  );
}

export type VidroProps = Omit<VidroGrupoProps, 'x' | 'y'>;

/** Uso isolado (fora de outro Canvas) — ex. telas/provas de conceito dedicadas só ao vidro. */
export function Vidro({ largura, altura, ...resto }: VidroProps) {
  return (
    <Canvas style={[styles.canvas, { width: largura, height: altura }]}>
      <VidroGrupo x={0} y={0} largura={largura} altura={altura} {...resto} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: 'transparent',
  },
});
