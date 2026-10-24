import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { FormaPontos, type ConfigForma } from '@/visual/FormaPontos';

// Tela de prova de conceito da Fase 0 (issue #5: "Provar forma de pontos a 55+ fps").
// Troca o clima para observar a forma suavizando cor/amplitude/rotação/respiração.
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
const ORDEM_CLIMAS = Object.keys(CLIMAS) as (keyof typeof CLIMAS)[];

export default function Index() {
  const configAlvo = useSharedValue<ConfigForma>(CLIMAS.tempestade);
  const [climaAtual, setClimaAtual] = useState<keyof typeof CLIMAS>('tempestade');

  function proximoClima() {
    const indice = (ORDEM_CLIMAS.indexOf(climaAtual) + 1) % ORDEM_CLIMAS.length;
    const novo = ORDEM_CLIMAS[indice];
    setClimaAtual(novo);
    configAlvo.value = CLIMAS[novo];
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Refúgio Sensorial</Text>
      <Text style={styles.subtitle}>Prova de conceito — forma de pontos (Skia)</Text>
      <FormaPontos tamanho={280} configAlvo={configAlvo} />
      <Pressable onPress={proximoClima} style={styles.botao}>
        <Text style={styles.botaoTexto}>Clima: {climaAtual} (toque para trocar)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#0E0E14',
  },
  title: {
    color: '#FCFCFC',
    fontSize: 28,
    fontWeight: '300',
  },
  subtitle: {
    color: 'rgba(252,252,252,0.6)',
    fontSize: 13,
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(252,252,252,0.36)',
  },
  botaoTexto: {
    color: '#FCFCFC',
    fontSize: 15,
  },
});
