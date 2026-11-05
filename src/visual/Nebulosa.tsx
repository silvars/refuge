import { Canvas, Circle, Group, Path, Points, RadialGradient, RoundedRect, Skia, rect, rrect, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { Mistura, ResumoDia } from '@/domain/tipos';

import { corDaMistura, posicaoDoDia, seeded } from './nebulosaGeometria';

// Porta de motor/motor-visual.js (RefugioNebulosa) para Skia (ver 02-sdd.md, seção 7.5). Sem
// Canvas próprio por padrão (embutir no Canvas ambiente da tela) — ver FormaPontos.tsx/Vidro.tsx:
// dois <Canvas> empilhados não compositam direito nesta versão do Skia.
//
// Desvio deliberado do protótipo: a cintilação individual de cada um dos 170 pontos de poeira
// (fase própria por ponto) virou um único pulso de opacidade compartilhado por todos — é um
// detalhe atmosférico de fundo, não essencial, e evita ter que rebaldear 170 pontos por quadro
// como em FormaPontos. A animação de "surgimento" das estrelas (40 ms entre elas) também não foi
// portada — todas aparecem de uma vez; reavaliar os dois se o resultado ficar monótono/abrupto.

const COR_FUNDO_CARD = '#0B0A12';
const RAIO_CARD = 24;
const COR_POEIRA = 'rgba(220,220,240,1)';
const OPACIDADE_BASE_POEIRA = 0.14;
const NUM_POEIRA = 170;
const COR_FIO = 'rgba(220,220,240,0.08)';
const RAIO_NEVOA_SEMANAL = 95;

export interface NebulosaGrupoProps {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Resumo de cada dia do mês (índice 0 = dia 1); `null` = sem check-in naquele dia. */
  dias: readonly (ResumoDia | null)[];
  /** Semanas domingo–sábado do mês (ver dominio.semanasDoMes). */
  semanas: readonly (readonly [number, number])[];
  /** Dia do mês (1-indexado) que é hoje, ou `null` se esta Nebulosa não é a do mês atual. */
  diaDeHoje: number | null;
  diaSelecionado: number | null;
  /** Com "reduzir movimento" do sistema, desenha um quadro estático (seção 7.3). */
  reduzirMovimento?: boolean;
}

function corGlow(cor: readonly [number, number, number], alfa: number): string {
  return `rgba(${cor[0]}, ${cor[1]}, ${cor[2]}, ${alfa})`;
}

/** Núcleo da estrela: a cor da mistura clareada 45% em direção ao branco (ver protótipo). */
function corNucleo(cor: readonly [number, number, number]): string {
  const [r, g, b] = cor.map((v) => Math.round(v + (255 - v) * 0.45));
  return `rgb(${r}, ${g}, ${b})`;
}

export function NebulosaGrupo({
  x,
  y,
  largura,
  altura,
  dias,
  semanas,
  diaDeHoje,
  diaSelecionado,
  reduzirMovimento = false,
}: NebulosaGrupoProps) {
  const fundo = rrect(rect(0, 0, largura, altura), RAIO_CARD, RAIO_CARD);

  const poeira = useMemo(
    () =>
      Array.from({ length: NUM_POEIRA }, (_, i) =>
        vec(seeded(i + 1000) * largura, seeded(i + 2000) * altura),
      ),
    [largura, altura],
  );

  const fio = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    dias.forEach((_, idx) => {
      const d = idx + 1;
      const p = posicaoDoDia(d, largura, altura);
      if (d === 1) builder.moveTo(p.x, p.y);
      else builder.lineTo(p.x, p.y);
    });
    return builder.detach();
  }, [dias, largura, altura]);

  const nevoasSemanais = useMemo(() => {
    return semanas
      .map(([inicio, fim]) => {
        let n = 0;
        let cx = 0;
        let cy = 0;
        const somaMix: Mistura = { tempestade: 0, nevoa: 0, clareira: 0 };
        for (let d = inicio; d <= fim; d++) {
          const resumo = dias[d - 1];
          if (!resumo) continue;
          const p = posicaoDoDia(d, largura, altura);
          n++;
          cx += p.x;
          cy += p.y;
          somaMix.tempestade += resumo.misturaMedia.tempestade;
          somaMix.nevoa += resumo.misturaMedia.nevoa;
          somaMix.clareira += resumo.misturaMedia.clareira;
        }
        if (!n) return null;
        return { cx: cx / n, cy: cy / n, cor: corDaMistura(somaMix) };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [dias, semanas, largura, altura]);

  const tempo = useSharedValue(0);
  useFrameCallback((frameInfo) => {
    'worklet';
    tempo.value = frameInfo.timestamp / 1000;
  }, !reduzirMovimento);

  const opacidadePoeira = useDerivedValue(() => {
    'worklet';
    if (reduzirMovimento) return OPACIDADE_BASE_POEIRA * 0.6;
    return OPACIDADE_BASE_POEIRA * (0.6 + 0.4 * Math.sin(tempo.value * 0.8));
  });

  const resumoHoje = diaDeHoje ? dias[diaDeHoje - 1] : null;
  const tamanhoBaseHoje = resumoHoje ? 2.2 + resumoHoje.contagem * 1.1 : 0;
  const tamanhoCoreHoje = useDerivedValue(() => {
    'worklet';
    if (reduzirMovimento) return tamanhoBaseHoje;
    return tamanhoBaseHoje * (1 + 0.22 * Math.sin(tempo.value * 2.2));
  });
  const tamanhoGlowHoje = useDerivedValue(() => tamanhoCoreHoje.value * 5);

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]} clip={fundo}>
      <RoundedRect rect={fundo} color={COR_FUNDO_CARD} />
      <Points points={poeira} mode="points" style="stroke" strokeWidth={1} color={COR_POEIRA} opacity={opacidadePoeira} />
      {nevoasSemanais.map((n, i) => (
        <Circle key={i} cx={n.cx} cy={n.cy} r={RAIO_NEVOA_SEMANAL} blendMode="plus">
          <RadialGradient c={vec(n.cx, n.cy)} r={RAIO_NEVOA_SEMANAL} colors={[corGlow(n.cor, 0.26), corGlow(n.cor, 0)]} />
        </Circle>
      ))}
      <Path path={fio} style="stroke" strokeWidth={1} color={COR_FIO} />
      {dias.map((resumo, idx) => {
        const d = idx + 1;
        const pos = posicaoDoDia(d, largura, altura);
        if (!resumo) {
          return <Circle key={d} cx={pos.x} cy={pos.y} r={1.3} color="rgba(200,200,225,0.35)" />;
        }
        const cor = corDaMistura(resumo.misturaMedia);
        const ehHoje = d === diaDeHoje;
        const tamanhoBase = 2.2 + resumo.contagem * 1.1;
        const tamanhoCore = ehHoje ? tamanhoCoreHoje : tamanhoBase;
        const tamanhoGlow = ehHoje ? tamanhoGlowHoje : tamanhoBase * 5;
        return (
          <Group key={d}>
            <Circle cx={pos.x} cy={pos.y} r={tamanhoGlow} blendMode="plus">
              <RadialGradient c={vec(pos.x, pos.y)} r={tamanhoGlow} colors={[corGlow(cor, 0.55), corGlow(cor, 0)]} />
            </Circle>
            <Circle cx={pos.x} cy={pos.y} r={tamanhoCore} color={corNucleo(cor)} />
            {d === diaSelecionado && (
              <Circle cx={pos.x} cy={pos.y} r={tamanhoBase + 7} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.85)" />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

export type NebulosaProps = Omit<NebulosaGrupoProps, 'x' | 'y'>;

/** Uso isolado (fora de outro Canvas) — ex. telas/provas de conceito dedicadas só à Nebulosa. */
export function Nebulosa({ largura, altura, ...resto }: NebulosaProps) {
  return (
    <Canvas style={[styles.canvas, { width: largura, height: altura }]}>
      <NebulosaGrupo x={0} y={0} largura={largura} altura={altura} {...resto} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: 'transparent',
  },
});
