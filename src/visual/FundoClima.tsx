import { Canvas, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import {
  Easing,
  interpolateColor,
  useDerivedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { isLight, layerOpacities } from '@/domain/clima';
import type { Pesos } from '@/domain/tipos';

import { pontosDoAngulo } from './geometria';

// Porta de FundoClima (ver 02-sdd.md, seção 7.1): 5 camadas Skia empilhadas — neutro sempre
// visível por baixo, 3 degradês de clima (as opacidades de motor-clima.js/layerOpacities fazem a
// composição alfa dar exatamente a média ponderada) e uma sobreposição de esmaecimento por cima.
// Ângulo e paradas de cor replicam conteudo/estados.json
// (linear-gradient(165deg, c0 0%, c1 55%, c2 100%)).

const COR_NEUTRA = '#0E0E14';
const COR_ESMAECIDO = '#3A3A44';
const OPACIDADE_ESMAECIDO_MAX = 0.55;
const ANGULO_GRAUS = 165;
const PARADAS = [0, 0.55, 1];
const DURACAO_TRANSICAO_MS = 2800;
const CURVA_TRANSICAO = Easing.bezier(0.45, 0, 0.25, 1);

const DEGRADES: Record<keyof Pesos, string[]> = {
  tempestade: ['#16253D', '#24395A', '#48573D'],
  nevoa: ['#4B3E72', '#7D6699', '#B48EA6'],
  clareira: ['#F4EDCB', '#E1EDCB', '#C6DEBA'],
};

export interface FundoClimaProps {
  largura: number;
  altura: number;
  /** Frações da mistura (ver clima.normalize); muda discretamente — as opacidades suavizam sozinhas. */
  pesosAlvo: SharedValue<Pesos>;
  /** Esmaecimento por inatividade (ver clima.isStale). */
  esmaecidoAlvo: SharedValue<boolean>;
}

export function FundoClima({ largura, altura, pesosAlvo, esmaecidoAlvo }: FundoClimaProps) {
  const { inicio: inicioPlano, fim: fimPlano } = pontosDoAngulo(ANGULO_GRAUS, largura, altura);
  const inicio = vec(inicioPlano.x, inicioPlano.y);
  const fim = vec(fimPlano.x, fimPlano.y);

  const opTempestade = useDerivedValue(() =>
    withTiming(layerOpacities(pesosAlvo.value).tempestade, {
      duration: DURACAO_TRANSICAO_MS,
      easing: CURVA_TRANSICAO,
    }),
  );
  const opNevoa = useDerivedValue(() =>
    withTiming(layerOpacities(pesosAlvo.value).nevoa, { duration: DURACAO_TRANSICAO_MS, easing: CURVA_TRANSICAO }),
  );
  const opClareira = useDerivedValue(() =>
    withTiming(layerOpacities(pesosAlvo.value).clareira, {
      duration: DURACAO_TRANSICAO_MS,
      easing: CURVA_TRANSICAO,
    }),
  );
  const opEsmaecido = useDerivedValue(() =>
    withTiming(esmaecidoAlvo.value ? OPACIDADE_ESMAECIDO_MAX : 0, {
      duration: DURACAO_TRANSICAO_MS,
      easing: CURVA_TRANSICAO,
    }),
  );

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={largura} height={altura} color={COR_NEUTRA} />
      <Group opacity={opTempestade}>
        <Rect x={0} y={0} width={largura} height={altura}>
          <LinearGradient start={inicio} end={fim} colors={DEGRADES.tempestade} positions={PARADAS} />
        </Rect>
      </Group>
      <Group opacity={opNevoa}>
        <Rect x={0} y={0} width={largura} height={altura}>
          <LinearGradient start={inicio} end={fim} colors={DEGRADES.nevoa} positions={PARADAS} />
        </Rect>
      </Group>
      <Group opacity={opClareira}>
        <Rect x={0} y={0} width={largura} height={altura}>
          <LinearGradient start={inicio} end={fim} colors={DEGRADES.clareira} positions={PARADAS} />
        </Rect>
      </Group>
      <Group opacity={opEsmaecido}>
        <Rect x={0} y={0} width={largura} height={altura} color={COR_ESMAECIDO} />
      </Group>
    </Canvas>
  );
}

/** Cor de texto animada entre escuro (#FCFCFC) e claro (#231F20) — ver 02-sdd.md, seção 7.1. */
export function useCorTintaAnimada(pesosAlvo: SharedValue<Pesos>, esmaecidoAlvo: SharedValue<boolean>): SharedValue<string> {
  return useDerivedValue(() => {
    const alvo = isLight(pesosAlvo.value, esmaecidoAlvo.value) ? 1 : 0;
    return interpolateColor(withTiming(alvo, { duration: 1600 }), [0, 1], ['#FCFCFC', '#231F20']);
  });
}
