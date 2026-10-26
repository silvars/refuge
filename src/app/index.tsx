import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { MotorAudio } from '@/audio/MotorAudio';
import { configurarSessaoAudio } from '@/audio/sessao';
import { abrirBanco } from '@/data/db';
import type { Clima, Pesos } from '@/domain/tipos';
import { IDIOMAS_SUPORTADOS, trocarIdioma, type Idioma } from '@/i18n';
import { useRefugioStore } from '@/store';
import { CORES, RAIO_BOTAO, TIPOGRAFIA } from '@/visual/tokens';
import { FundoClima } from '@/visual/FundoClima';
import { FormaPontosGrupo, type ConfigForma } from '@/visual/FormaPontos';
import { VidroGrupo } from '@/visual/Vidro';

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

// Tela de prova de conceito da Fase 0 (issues #5 e #4: forma de pontos + motor de áudio).
// Substituída pela tela principal de verdade na Fase 2/3 — ver 02-sdd.md, seção 13.

const CLIMAS: Record<string, ConfigForma> = {
  tempestade: {
    amp: 1.6,
    speed: 1.9,
    rot: 0.42,
    col: [96, 150, 214],
    raioFracao: 0.33,
    respiracao: { periodoS: 11, fracaoInspira: 4 / 11, escalaMin: 0.62, escalaMax: 1.15 },
  },
  nevoa: {
    amp: 0.8,
    speed: 0.55,
    rot: 0.14,
    col: [178, 140, 228],
    raioFracao: 0.33,
    respiracao: { periodoS: 10, fracaoInspira: 0.5, escalaMin: 0.62, escalaMax: 1.15 },
  },
  clareira: {
    amp: 0.45,
    speed: 0.35,
    rot: 0.11,
    col: [246, 206, 96],
    raioFracao: 0.33,
    respiracao: { periodoS: 8, fracaoInspira: 0.5, escalaMin: 0.62, escalaMax: 1.15 },
  },
};
const PESOS_POR_CLIMA: Record<string, Pesos> = {
  tempestade: { tempestade: 1, nevoa: 0, clareira: 0 },
  nevoa: { tempestade: 0, nevoa: 1, clareira: 0 },
  clareira: { tempestade: 0, nevoa: 0, clareira: 1 },
};
const ORDEM_CLIMAS = Object.keys(CLIMAS) as (keyof typeof CLIMAS)[];

export default function Index() {
  const { t, i18n } = useTranslation();
  const { width, height } = useWindowDimensions();
  const configAlvo = useSharedValue<ConfigForma>(CLIMAS.tempestade);
  const pesosAlvo = useSharedValue<Pesos>(PESOS_POR_CLIMA.tempestade);
  const esmaecidoAlvo = useSharedValue(false);
  const [climaAtual, setClimaAtual] = useState<keyof typeof CLIMAS>('tempestade');
  const [somLigado, setSomLigado] = useState(false);
  const [origemForma, setOrigemForma] = useState({ x: 0, y: 0 });
  const [retBotaoClima, setRetBotaoClima] = useState<RetanguloLayout | null>(null);
  const [retBotaoSom, setRetBotaoSom] = useState<RetanguloLayout | null>(null);
  const [retBotaoBanco, setRetBotaoBanco] = useState<RetanguloLayout | null>(null);
  const [retBotaoIdioma, setRetBotaoIdioma] = useState<RetanguloLayout | null>(null);
  const [statusBanco, setStatusBanco] = useState('banco: não testado ainda');
  const motorRef = useRef<MotorAudio | null>(null);
  const pararSessaoRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      pararSessaoRef.current?.();
      motorRef.current?.descartar();
    },
    [],
  );

  function proximoClima() {
    const indice = (ORDEM_CLIMAS.indexOf(climaAtual) + 1) % ORDEM_CLIMAS.length;
    const novo = ORDEM_CLIMAS[indice];
    setClimaAtual(novo);
    configAlvo.value = CLIMAS[novo];
    pesosAlvo.value = PESOS_POR_CLIMA[novo];
    motorRef.current?.definirMistura(PESOS_POR_CLIMA[novo]);
  }

  function alternarSom() {
    if (!motorRef.current) {
      motorRef.current = new MotorAudio();
      motorRef.current.iniciar();
      motorRef.current.definirMistura(PESOS_POR_CLIMA[climaAtual]);
      pararSessaoRef.current = configurarSessaoAudio(motorRef.current);
      setSomLigado(true);
      return;
    }
    if (somLigado) {
      motorRef.current.pausar();
    } else {
      motorRef.current.retomar();
    }
    setSomLigado(!somLigado);
  }

  async function proximoIdioma() {
    const indice = (IDIOMAS_SUPORTADOS.indexOf(i18n.language as Idioma) + 1) % IDIOMAS_SUPORTADOS.length;
    const db = await abrirBanco();
    await trocarIdioma(IDIOMAS_SUPORTADOS[indice], db);
  }

  async function testarBanco() {
    setStatusBanco('banco: gravando...');
    try {
      const store = useRefugioStore.getState();
      await store.carregar();
      const pesos = PESOS_POR_CLIMA[climaAtual];
      await store.registrarCheckin({
        id: Crypto.randomUUID(),
        em: Date.now(),
        // climaAtual é uma chave de CLIMAS (tempestade/nevoa/clareira) — mesmas 3 chaves de Clima.
        clima: climaAtual as Clima,
        mistura: { tempestade: pesos.tempestade * 100, nevoa: pesos.nevoa * 100, clareira: pesos.clareira * 100 },
        respostas: [],
        etiquetas: [],
      });
      const { estadoDerivado } = useRefugioStore.getState();
      setStatusBanco(
        `banco: ok — clima ${estadoDerivado.climaAtual}, sequência ${estadoDerivado.sequencia}`,
      );
    } catch (erro) {
      setStatusBanco(`banco: erro — ${String(erro)}`);
    }
  }

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        <FormaPontosGrupo tamanho={280} configAlvo={configAlvo} origem={origemForma} />
        {retBotaoClima && <VidroGrupo {...retBotaoClima} raio={RAIO_BOTAO} cor={CORES.escuro.vidro} />}
        {retBotaoSom && <VidroGrupo {...retBotaoSom} raio={RAIO_BOTAO} cor={CORES.escuro.vidro} />}
        {retBotaoBanco && <VidroGrupo {...retBotaoBanco} raio={RAIO_BOTAO} cor={CORES.escuro.vidro} />}
        {retBotaoIdioma && <VidroGrupo {...retBotaoIdioma} raio={RAIO_BOTAO} cor={CORES.escuro.vidro} />}
      </FundoClima>
      <Text style={styles.title}>{t('app.nome')}</Text>
      <Text style={styles.subtitle}>{t('demo.subtitulo')}</Text>
      <View
        style={styles.espacoForma}
        onLayout={(e) => {
          const { x, y } = e.nativeEvent.layout;
          setOrigemForma({ x, y });
        }}
      />
      <Pressable
        onPress={proximoClima}
        style={styles.botao}
        onLayout={(e) => {
          const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
          setRetBotaoClima({ x, y, largura, altura });
        }}
      >
        <Text style={styles.botaoTexto}>{t('demo.botaoClima', { clima: climaAtual })}</Text>
      </Pressable>
      <Pressable
        onPress={alternarSom}
        style={styles.botao}
        onLayout={(e) => {
          const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
          setRetBotaoSom({ x, y, largura, altura });
        }}
      >
        <Text style={styles.botaoTexto}>{t(somLigado ? 'demo.botaoSomLigado' : 'demo.botaoSomDesligado')}</Text>
      </Pressable>
      <Pressable
        onPress={proximoIdioma}
        style={styles.botao}
        onLayout={(e) => {
          const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
          setRetBotaoIdioma({ x, y, largura, altura });
        }}
      >
        <Text style={styles.botaoTexto}>Idioma: {i18n.language} (toque para trocar)</Text>
      </Pressable>
      <Pressable
        onPress={testarBanco}
        style={styles.botao}
        onLayout={(e) => {
          const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
          setRetBotaoBanco({ x, y, largura, altura });
        }}
      >
        <Text style={styles.botaoTexto}>{t('demo.botaoBanco')}</Text>
      </Pressable>
      <Text style={styles.subtitle}>{statusBanco}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.tituloTela,
  },
  subtitle: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.rotulo,
  },
  espacoForma: {
    width: 280,
    height: 280,
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  botaoTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.corpo,
  },
});
