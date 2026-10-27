import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { getEstados } from '@/conteudo';
import { definirMisturaTrilha } from '@/audio/trilha';
import { shouldSuggestPorto } from '@/domain/clima';
import type { Pesos } from '@/domain/tipos';
import { useReduzirMovimento } from '@/hooks/useReduzirMovimento';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { useRefugioStore } from '@/store';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { FormaPontosGrupo, type ConfigForma } from '@/visual/FormaPontos';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_BOTAO, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';
// Tela principal (ver especificação F7). Versão mínima que fecha o fluxo de check-in da Fase 2 —
// Ajuda global e card de frase do dia entram na Fase 3 (02-sdd.md, seção 13).

const PESOS_NEUTRO: Pesos = { tempestade: 0, nevoa: 0, clareira: 0 };
const TAMANHO_FORMA = 280;
/** Respiração da forma na tela principal é sempre a mesma, independente do clima (ver protótipo). */
const RESPIRACAO_PRINCIPAL = { periodoS: 6, fracaoInspira: 0.5, escalaMin: 0.96, escalaMax: 1.04 };
const CONFIG_SEM_CHECKIN: ConfigForma = {
  amp: 1,
  speed: 1,
  rot: 0.22,
  col: [252, 252, 252],
  raioFracao: 0.33,
  respiracao: RESPIRACAO_PRINCIPAL,
};

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Principal() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const reduzirMovimento = useReduzirMovimento();

  const carregado = useRefugioStore((s) => s.carregado);
  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);

  const [nomeClima, setNomeClima] = useState<string | null>(null);
  const pesosAlvo = useSharedValue<Pesos>(PESOS_NEUTRO);
  const esmaecidoAlvo = useSharedValue(false);
  const configAlvo = useSharedValue<ConfigForma>(CONFIG_SEM_CHECKIN);
  const [origemForma, setOrigemForma] = useState({ x: 0, y: 0 });
  const [retMedir, setRetMedir] = useState<RetanguloLayout | null>(null);
  const [retPorto, setRetPorto] = useState<RetanguloLayout | null>(null);
  const [retNebulosa, setRetNebulosa] = useState<RetanguloLayout | null>(null);
  const refMedir = useRef<ElementRef<typeof Pressable>>(null);
  const refPorto = useRef<ElementRef<typeof Pressable>>(null);
  const refNebulosa = useRef<ElementRef<typeof Pressable>>(null);

  useEffect(() => {
    if (!carregado) useRefugioStore.getState().carregar();
  }, [carregado]);

  useEffect(() => {
    const { climaAtual, misturaAtual, esmaecido } = estadoDerivado;
    esmaecidoAlvo.value = esmaecido;

    if (!climaAtual || !misturaAtual) {
      pesosAlvo.value = PESOS_NEUTRO;
      configAlvo.value = CONFIG_SEM_CHECKIN;
      definirMisturaTrilha(null);
      Promise.resolve().then(() => setNomeClima(null));
      return;
    }

    pesosAlvo.value = {
      tempestade: misturaAtual.tempestade / 100,
      nevoa: misturaAtual.nevoa / 100,
      clareira: misturaAtual.clareira / 100,
    };
    definirMisturaTrilha(pesosAlvo.value);

    const claro = !esmaecido && ehModoClaro(misturaAtual.clareira / 100);
    getEstados().then((estados) => {
      const estado = estados.estados[climaAtual];
      setNomeClima(textoLocalizado(estado.nome, idioma));
      configAlvo.value = {
        amp: estado.forma_tela_principal.amplitude,
        speed: estado.forma_tela_principal.velocidade,
        rot: estado.forma_tela_principal.rotacao,
        col: claro ? [35, 31, 32] : [252, 252, 252],
        raioFracao: 0.3,
        respiracao: RESPIRACAO_PRINCIPAL,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoDerivado, idioma]);

  const emModoClaro =
    !estadoDerivado.esmaecido &&
    !!estadoDerivado.misturaAtual &&
    ehModoClaro(estadoDerivado.misturaAtual.clareira / 100);
  const tinta = emModoClaro ? CORES.claro.tinta : CORES.escuro.tinta;
  const tintaSecundaria = emModoClaro ? CORES.claro.tintaSecundaria : CORES.escuro.tintaSecundaria;
  const corFio = emModoClaro ? CORES.claro.fio : CORES.escuro.fio;
  const corVidroForte = emModoClaro ? CORES.claro.vidroForte : CORES.escuro.vidroForte;
  const corVidro = emModoClaro ? CORES.claro.vidro : CORES.escuro.vidro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens: emModoClaro ? CORES.claro : CORES.escuro });

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        <FormaPontosGrupo
          tamanho={TAMANHO_FORMA}
          configAlvo={configAlvo}
          reduzirMovimento={reduzirMovimento}
          origem={origemForma}
        />
        {retMedir && <VidroGrupo {...retMedir} raio={RAIO_BOTAO} cor={corVidroForte} corFio={corFio} />}
        {retPorto && <VidroGrupo {...retPorto} raio={RAIO_BOTAO} cor={corVidro} corFio={corFio} />}
        {retNebulosa && <VidroGrupo {...retNebulosa} raio={RAIO_BOTAO} cor={corVidro} corFio={corFio} />}
        {barraVidro}
      </FundoClima>
      {barra}

      <View style={styles.topo}>
        <Text style={[styles.rotulo, { color: tintaSecundaria }]}>{t('principal.seuClimaAgora')}</Text>
        <Text style={[styles.nomeClima, { color: tinta }]}>{nomeClima ?? t('principal.semCheckinAinda')}</Text>

        {estadoDerivado.esmaecido && (
          <View style={styles.banner}>
            <Text style={[styles.bannerTexto, { color: tintaSecundaria }]}>{t('principal.esmaecidoTexto')}</Text>
            <Pressable onPress={() => router.push('/vamos-comecar')}>
              <Text style={[styles.bannerLink, { color: tinta }]}>{t('principal.esmaecidoBotao')}</Text>
            </Pressable>
          </View>
        )}

        {!estadoDerivado.esmaecido && shouldSuggestPorto(estadoDerivado.sequencia) && (
          <View style={styles.banner}>
            <Text style={[styles.bannerTexto, { color: tintaSecundaria }]}>{t('principal.sequenciaTexto')}</Text>
            <Pressable onPress={() => router.push('/porto-seguro')}>
              <Text style={[styles.bannerLink, { color: tinta }]}>{t('principal.compartilharPortoSeguro')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={styles.espacoForma}
        onLayout={(e) => {
          const { x, y } = e.nativeEvent.layout;
          setOrigemForma({ x, y });
        }}
      />

      <View style={styles.botoes}>
        <Pressable
          ref={refMedir}
          onPress={() => router.push('/vamos-comecar')}
          style={styles.botao}
          onLayout={() => {
            refMedir.current?.measureInWindow((x, y, largura, altura) => setRetMedir({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tinta }]}>{t('principal.medirMeuClima')}</Text>
        </Pressable>
        <Pressable
          ref={refPorto}
          onPress={() => router.push('/porto-seguro')}
          style={styles.botao}
          onLayout={() => {
            refPorto.current?.measureInWindow((x, y, largura, altura) => setRetPorto({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tinta }]}>{t('principal.compartilharPortoSeguro')}</Text>
        </Pressable>
        <Pressable
          ref={refNebulosa}
          style={styles.botao}
          onLayout={() => {
            refNebulosa.current?.measureInWindow((x, y, largura, altura) => setRetNebulosa({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tinta }]}>{t('principal.minhaNebulosa')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 72,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 16,
  },
  topo: {
    alignItems: 'center',
    gap: 8,
  },
  rotulo: {
    ...TIPOGRAFIA.rotulo,
  },
  nomeClima: {
    ...TIPOGRAFIA.nomeClima,
  },
  banner: {
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  bannerTexto: {
    textAlign: 'center',
    ...TIPOGRAFIA.corpo,
  },
  bannerLink: {
    ...TIPOGRAFIA.destaque,
  },
  espacoForma: {
    width: TAMANHO_FORMA,
    height: TAMANHO_FORMA,
  },
  botoes: {
    width: '100%',
    gap: 12,
  },
  botao: {
    height: 52,
    borderRadius: RAIO_BOTAO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    ...TIPOGRAFIA.destaque,
  },
});
