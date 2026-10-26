import { Canvas, Group, Path, Skia, select } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

// Porta de motor/motor-visual.js (RefugioForma) para Skia + Reanimated.
// v2 do @shopify/react-native-skia (não v3/"react-native-skia"): v3 exige Vulkan 1.1 no
// Android e fica com o canvas em branco sem isso — inaceitável para "aparelho intermediário"
// (ver 02-sdd.md, seção 2). Mantemos a mesma matemática do protótipo; único desvio deliberado:
// a opacidade por profundidade (originalmente contínua, por ponto) é quantizada em NUM_BALDES
// faixas para desenhar poucos Path grandes em vez de 1 círculo-componente por ponto — Skia não
// tem opacidade por vértice num único Path. Reavaliar após medir fps real no aparelho.

export interface ConfigForma {
  amp: number;
  speed: number;
  rot: number;
  /** RGB 0–255. */
  col: readonly [number, number, number];
  /** Raio da forma como fração do lado do canvas. */
  raioFracao: number;
  respiracao: { periodoS: number; fracaoInspira: number; escalaMin: number; escalaMax: number };
}

interface Ponto3D {
  x: number;
  y: number;
  z: number;
}

interface PontoProjetado {
  x: number;
  y: number;
  alfa: number;
  raio: number;
}

const NUM_BALDES = 12;

function easeRespiracao(x: number): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

/** Esfera de Fibonacci com N pontos — mesma distribuição do protótipo (fibSphere). */
function esferaFibonacci(n: number): Ponto3D[] {
  const pontos: Ponto3D[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    pontos.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
  }
  return pontos;
}

interface FormaPontosGrupoProps {
  /** Lado da forma (quadrado), em dp. */
  tamanho: number;
  /** Configuração-alvo; muda discretamente (ex. troca de clima), a forma suaviza sozinha. */
  configAlvo: SharedValue<ConfigForma>;
  /** Com "reduzir movimento" do sistema, desenha um quadro estático (sem useFrameCallback ativo). */
  reduzirMovimento?: boolean;
  /** Posição do canto superior esquerdo da forma dentro do Canvas ambiente (padrão: origem 0,0). */
  origem?: { x: number; y: number };
}

type FormaPontosProps = FormaPontosGrupoProps;

/** Um balde de opacidade: um único Path (todos os círculos daquela faixa de alfa) + sua cor. */
function useBalde(projecao: SharedValue<PontoProjetado[]>, cur: SharedValue<ConfigForma['col']>, indiceBalde: number) {
  const alfaCentral = (indiceBalde + 0.5) / NUM_BALDES;
  return useDerivedValue(() => {
    'worklet';
    // SkPath é imutável nesta versão do Skia; construir via PathBuilder e "detach" no final.
    const builder = Skia.PathBuilder.Make();
    const pontosProjetados = projecao.value;
    for (let i = 0; i < pontosProjetados.length; i++) {
      const p = pontosProjetados[i];
      const idx = Math.min(NUM_BALDES - 1, Math.max(0, Math.floor(p.alfa * NUM_BALDES)));
      if (idx === indiceBalde) builder.addCircle(p.x, p.y, p.raio);
    }
    const [r, g, b] = cur.value;
    const color = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alfaCentral.toFixed(3)})`;
    return { path: builder.detach(), color };
  });
}

/**
 * Conteúdo da forma de pontos (sem Canvas próprio) — embuta num Canvas ambiente, ex. o de
 * FundoClima. Dois `<Canvas>` do Skia empilhados na mesma tela não compositam direito nesta
 * versão (cada um é sua própria superfície Metal/GPU); por isso só o fundo possui Canvas e o
 * resto do conteúdo visual da tela entra como filho dele.
 */
export function FormaPontosGrupo({ tamanho, configAlvo, reduzirMovimento = false, origem = { x: 0, y: 0 } }: FormaPontosGrupoProps) {
  const n = tamanho > 200 ? 1400 : 900;
  const pontos = useMemo(() => esferaFibonacci(n), [n]);

  // Estado suavizado (equivalente a `cur` no protótipo: amp/speed/rot/col aproximam o alvo a
  // cada quadro com fator k = min(1, dt*0.8); a respiração não é suavizada, é lida direto do alvo).
  const curAmpSpeedRot = useSharedValue({ amp: 1, speed: 1, rot: 0.2 });
  const curCol = useSharedValue<ConfigForma['col']>([252, 252, 252]);
  const fase = useSharedValue(0);
  const faseRotacao = useSharedValue(0);
  const tempoInicioMs = useSharedValue<number | null>(null);
  const ultimoFrameMs = useSharedValue<number | null>(null);

  const projecao = useSharedValue<PontoProjetado[]>(pontos.map(() => ({ x: tamanho / 2, y: tamanho / 2, alfa: 0, raio: 0 })));

  useFrameCallback((frameInfo) => {
    'worklet';
    const agoraMs = frameInfo.timestamp;
    if (tempoInicioMs.value === null) tempoInicioMs.value = agoraMs;
    const ultimo = ultimoFrameMs.value ?? agoraMs;
    const dt = Math.min(0.05, (agoraMs - ultimo) / 1000);
    ultimoFrameMs.value = agoraMs;

    const alvo = configAlvo.value;
    const k = Math.min(1, dt * 0.8);
    const c = curAmpSpeedRot.value;
    curAmpSpeedRot.value = {
      amp: c.amp + (alvo.amp - c.amp) * k,
      speed: c.speed + (alvo.speed - c.speed) * k,
      rot: c.rot + (alvo.rot - c.rot) * k,
    };
    const colAtual = curCol.value;
    curCol.value = [
      colAtual[0] + (alvo.col[0] - colAtual[0]) * k,
      colAtual[1] + (alvo.col[1] - colAtual[1]) * k,
      colAtual[2] + (alvo.col[2] - colAtual[2]) * k,
    ];

    fase.value += dt * curAmpSpeedRot.value.speed;
    faseRotacao.value += dt * curAmpSpeedRot.value.rot;

    const br = alvo.respiracao;
    const u = (((agoraMs - (tempoInicioMs.value ?? agoraMs)) / 1000) % br.periodoS) / br.periodoS;
    const sv = u < br.fracaoInspira ? easeRespiracao(u / br.fracaoInspira) : 1 - easeRespiracao((u - br.fracaoInspira) / (1 - br.fracaoInspira));
    const raioPx = alvo.raioFracao * tamanho * (br.escalaMin + (br.escalaMax - br.escalaMin) * sv);

    const ph = fase.value;
    const ay = faseRotacao.value;
    const ax = 0.4 + 0.18 * Math.sin(ay * 0.8);
    const cy = Math.cos(ay);
    const sy = Math.sin(ay);
    const cx = Math.cos(ax);
    const sx = Math.sin(ax);
    const amp = curAmpSpeedRot.value.amp;

    const novaProjecao = new Array<PontoProjetado>(pontos.length);
    for (let i = 0; i < pontos.length; i++) {
      const p = pontos[i];
      const d =
        1 +
        amp *
          (0.14 * Math.sin(2.1 * p.x + 1.7 * p.y + ph * 0.8) +
            0.09 * Math.sin(3.3 * p.y - 2.2 * p.z + ph * 1.2) +
            0.06 * Math.sin(4.1 * p.z + 2.7 * p.x - ph * 0.6));
      const X = p.x * d;
      const Y = p.y * d;
      const Z = p.z * d;
      const x1 = X * cy + Z * sy;
      const z1 = -X * sy + Z * cy;
      const y1 = Y * cx - z1 * sx;
      const z2 = Y * sx + z1 * cx;
      const f = 3 / (3 - z2);
      const depth = Math.max(0, Math.min(1, (z2 / d + 1) / 2));
      const rim = 1 - Math.abs(z2 / d);
      const alfa = Math.min(1, 0.08 + 0.55 * depth + 0.4 * rim * depth);
      const raio = (0.5 + 0.9 * depth) * (tamanho / 280 + 0.25);
      novaProjecao[i] = { x: tamanho / 2 + x1 * raioPx * f, y: tamanho / 2 + y1 * raioPx * f, alfa, raio };
    }
    projecao.value = novaProjecao;
  }, !reduzirMovimento);

  // NUM_BALDES=12 é constante — hooks desenrolados explicitamente (nunca em loop/.map()).
  const balde0 = useBalde(projecao, curCol, 0);
  const balde1 = useBalde(projecao, curCol, 1);
  const balde2 = useBalde(projecao, curCol, 2);
  const balde3 = useBalde(projecao, curCol, 3);
  const balde4 = useBalde(projecao, curCol, 4);
  const balde5 = useBalde(projecao, curCol, 5);
  const balde6 = useBalde(projecao, curCol, 6);
  const balde7 = useBalde(projecao, curCol, 7);
  const balde8 = useBalde(projecao, curCol, 8);
  const balde9 = useBalde(projecao, curCol, 9);
  const balde10 = useBalde(projecao, curCol, 10);
  const balde11 = useBalde(projecao, curCol, 11);
  const baldes = [balde0, balde1, balde2, balde3, balde4, balde5, balde6, balde7, balde8, balde9, balde10, balde11];

  return (
    <Group transform={[{ translateX: origem.x }, { translateY: origem.y }]}>
      {baldes.map((balde, i) => (
        <Path key={i} path={select(balde, 'path')} color={select(balde, 'color')} style="fill" />
      ))}
    </Group>
  );
}

/** Uso isolado (fora de outro Canvas), ex. telas/provas de conceito dedicadas só à forma. */
export function FormaPontos(props: FormaPontosProps) {
  return (
    <Canvas style={[styles.canvas, { width: props.tamanho, height: props.tamanho }]}>
      <FormaPontosGrupo {...props} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: 'transparent',
  },
});
