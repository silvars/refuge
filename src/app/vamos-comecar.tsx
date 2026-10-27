import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';

import type { Pesos } from '@/domain/tipos';
import { useReduzirMovimento } from '@/hooks/useReduzirMovimento';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { FormaPontosGrupo, type ConfigForma } from '@/visual/FormaPontos';
import { FundoClima } from '@/visual/FundoClima';
import { CORES, RAIO_BOTAO, TIPOGRAFIA } from '@/visual/tokens';

// "Vamos começar?" (ver especificação F1/F2; 02-sdd.md, seção 7.6): antecede o onboarding e todo
// check-in (botão "Medir meu clima" e lembretes). Atrasos e durações exatos do protótipo
// (prototipo-jornada.dc.html, classes fade-1..4): 0,4/1,8/3,2/4,2 s, 1,4 s cada.

const PESOS_NEUTRO: Pesos = { tempestade: 0, nevoa: 0, clareira: 0 };
const TAMANHO_FORMA = 220;

/** Config da forma nesta tela ("ready" no protótipo) — bem mais calma que o check-in em si. */
const CONFIG_FORMA: ConfigForma = {
  amp: 0.6,
  speed: 0.6,
  rot: 0.15,
  col: [252, 252, 252],
  raioFracao: 0.32,
  respiracao: { periodoS: 6, fracaoInspira: 0.5, escalaMin: 0.92, escalaMax: 1.06 },
};

const ATRASO_BOTAO_MS = 4200;

export default function VamosComecar() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const reduzirMovimento = useReduzirMovimento();
  const pesosAlvo = useSharedValue<Pesos>(PESOS_NEUTRO);
  const esmaecidoAlvo = useSharedValue(false);
  const configAlvo = useSharedValue<ConfigForma>(CONFIG_FORMA);
  const [mostrarBotao, setMostrarBotao] = useState(false);

  useEffect(() => {
    const atraso = reduzirMovimento ? 0 : ATRASO_BOTAO_MS;
    const id = setTimeout(() => setMostrarBotao(true), atraso);
    return () => clearTimeout(id);
  }, [reduzirMovimento]);

  function comecar() {
    router.replace('/checkin');
  }

  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens: CORES.escuro, aoVoltar: () => router.back() });

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        <FormaPontosGrupo
          tamanho={TAMANHO_FORMA}
          configAlvo={configAlvo}
          reduzirMovimento={reduzirMovimento}
          origem={{ x: width / 2 - TAMANHO_FORMA / 2, y: height * 0.16 }}
        />
        {barraVidro}
      </FundoClima>
      {barra}
      <View style={styles.espacoForma} />
      <View style={styles.frases}>
        <Animated.Text
          style={styles.fraseMenor}
          entering={reduzirMovimento ? undefined : FadeInDown.delay(400).duration(1400)}
        >
          {t('vamosComecar.seAcomode')}
        </Animated.Text>
        <Animated.Text
          style={styles.fraseMenor}
          entering={reduzirMovimento ? undefined : FadeInDown.delay(1800).duration(1400)}
        >
          {t('vamosComecar.respireFundo')}
        </Animated.Text>
        <Animated.Text
          style={styles.fraseMaior}
          entering={reduzirMovimento ? undefined : FadeInDown.delay(3200).duration(1400)}
        >
          {t('vamosComecar.pergunta')}
        </Animated.Text>
      </View>
      {mostrarBotao && (
        <Animated.View entering={reduzirMovimento ? undefined : FadeInDown.duration(1400)}>
          <Pressable onPress={comecar} style={styles.botao}>
            <Text style={styles.botaoTexto}>{t('vamosComecar.botao')}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  espacoForma: {
    width: TAMANHO_FORMA,
    height: TAMANHO_FORMA,
  },
  frases: {
    alignItems: 'center',
    gap: 10,
  },
  fraseMenor: {
    color: CORES.escuro.tintaSecundaria,
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 24,
  },
  fraseMaior: {
    color: CORES.escuro.tinta,
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 32,
  },
  botao: {
    height: 52,
    paddingHorizontal: 40,
    borderRadius: RAIO_BOTAO,
    borderWidth: 1,
    borderColor: CORES.escuro.fio,
    backgroundColor: CORES.escuro.vidroForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
});
