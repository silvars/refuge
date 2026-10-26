import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCheckinSessao } from '@/checkin/sessao';
import type { Pergunta } from '@/conteudo/tipos';
import { getPerguntas } from '@/conteudo';
import { definirMisturaTrilha } from '@/audio/trilha';
import { dominant, normalize, totals } from '@/domain/clima';
import type { Clima, Pesos } from '@/domain/tipos';
import { hapticEscolha } from '@/haptics';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { useReduzirMovimento } from '@/hooks/useReduzirMovimento';
import { useRefugioStore } from '@/store';
import { CORES, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';
import { FundoClima } from '@/visual/FundoClima';

import { PausaRespiracao } from '@/checkin/PausaRespiracao';

// Fluxo de perguntas do check-in (ver especificação F2; 02-sdd.md, seção 7.6). Uma única tela
// (não uma rota por pergunta) porque a máquina de fases de transição precisa do mesmo contexto
// de animação entre uma pergunta e a próxima — replica a arquitetura do protótipo
// (tela "quiz" com índice interno), não uma pilha de navegação por pergunta.

const DURACAO_BRILHO_MS = 480;
const DURACAO_TOTAL_TRANSICAO_MS = 1050;
const ATRASO_INICIO_PALAVRAS_MS = 250;
const INTERVALO_PALAVRAS_MS = 90;
const DURACAO_PALAVRA_MS = 900;
const ATRASO_OPCOES_APOS_PALAVRAS_MS = 450;
const INTERVALO_OPCOES_MS = 170;
const DURACAO_OPCAO_MS = 800;
const DURACAO_SAIDA_OPCAO_MS = 380;

type Fase = 'idle' | 'pick' | 'leave';

export default function Checkin() {
  // React Compiler não entende a mutação imperativa de SharedValue do Reanimated (blocoOpacidade/
  // blocoTranslateY lidos por useAnimatedStyle) e acusa "immutability" nos lugares onde a gente
  // precisa mutar `.value` — opt-out documentado (ver https://docs.expo.dev/guides/react-compiler).
  'use no memo';

  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const reduzirMovimento = useReduzirMovimento();

  const sessao = useCheckinSessao((s) => s.sessao);
  const perguntas = useCheckinSessao((s) => s.perguntas);
  const iniciarSessao = useCheckinSessao((s) => s.iniciar);
  const responder = useCheckinSessao((s) => s.responder);
  const marcarPausaFeita = useCheckinSessao((s) => s.marcarPausaFeita);

  const vibracaoLigada = useRefugioStore((s) => s.preferencias.vibracao);
  const climaAtual = useRefugioStore((s) => s.estadoDerivado.climaAtual);
  const carregado = useRefugioStore((s) => s.carregado);

  const [conteudo, setConteudo] = useState<{ pausaAposIndice: number } | null>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [fase, setFase] = useState<Fase>('idle');
  const [opcaoEscolhida, setOpcaoEscolhida] = useState<number | null>(null);
  const [mostrarPausa, setMostrarPausa] = useState(false);
  const [climaParaPausa, setClimaParaPausa] = useState<Clima>('clareira');
  const pesosAlvo = useSharedValue<Pesos>({ tempestade: 0, nevoa: 0, clareira: 0 });
  const esmaecidoAlvo = useSharedValue(false);
  const blocoOpacidade = useSharedValue(1);
  const blocoTranslateY = useSharedValue(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const estiloBloco = useAnimatedStyle(() => ({
    opacity: blocoOpacidade.value,
    transform: [{ translateY: blocoTranslateY.value }],
  }));

  useEffect(() => {
    const timers = timersRef.current;
    (async () => {
      if (!carregado) await useRefugioStore.getState().carregar();
      const dados = await getPerguntas();
      iniciarSessao(dados.perguntas, useRefugioStore.getState().estadoDerivado.climaAtual);
      setConteudo({ pausaAposIndice: dados.pausa_apos_indice });
    })();
    return () => {
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessao) return;
    const mistura = totals(perguntas, sessao.respostas, sessao.climaAnterior);
    pesosAlvo.value = mistura;
    definirMisturaTrilha(mistura);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.respostas]);

  useEffect(() => {
    // react-hooks/immutability não reconhece a mutação de SharedValue do Reanimated como segura,
    // mesmo sendo exatamente o padrão documentado da lib (ver nota "use no memo" no topo do arquivo).
    // eslint-disable-next-line react-hooks/immutability
    blocoOpacidade.value = 1;
    // eslint-disable-next-line react-hooks/immutability
    blocoTranslateY.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiceAtual]);

  if (!sessao || !conteudo || perguntas.length === 0) {
    return (
      <View style={styles.container}>
        <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo} />
      </View>
    );
  }

  const pergunta: Pergunta = perguntas[indiceAtual];
  const ordem = sessao.ordens[indiceAtual];
  const palavras = textoLocalizado(pergunta.texto, idioma).split(' ');

  function finalizarPergunta(indiceOriginal: number) {
    responder(indiceAtual, indiceOriginal);
    if (vibracaoLigada) hapticEscolha().catch(() => {});

    if (reduzirMovimento) {
      avancar();
      return;
    }

    setFase('pick');
    const t1 = setTimeout(() => {
      setFase('leave');
      blocoOpacidade.value = withTiming(0, { duration: 450 });
      blocoTranslateY.value = withTiming(-14, { duration: 450 });
    }, DURACAO_BRILHO_MS);
    const t2 = setTimeout(() => avancar(), DURACAO_TOTAL_TRANSICAO_MS);
    timersRef.current.push(t1, t2);
  }

  function avancar() {
    const ehPausa = indiceAtual === conteudo!.pausaAposIndice && !sessao!.pausaFeita;
    const ehUltima = indiceAtual === perguntas.length - 1;

    setFase('idle');
    setOpcaoEscolhida(null);

    if (ehPausa) {
      setClimaParaPausa(dominant(pesosAlvo.value) ?? climaAtual ?? 'clareira');
      setMostrarPausa(true);
      return;
    }
    if (ehUltima) {
      router.replace('/checkin/etiquetas');
      return;
    }
    setIndiceAtual((i) => i + 1);
  }

  function continuarAposPausa() {
    marcarPausaFeita();
    setMostrarPausa(false);
    setIndiceAtual((i) => i + 1);
  }

  function voltar() {
    if (fase !== 'idle') return;
    if (indiceAtual === 0) {
      router.back();
      return;
    }
    setIndiceAtual((i) => i - 1);
  }

  if (mostrarPausa) {
    return <PausaRespiracao clima={climaParaPausa} rotulo={t('pausa.rotuloCheckin')} aoContinuar={continuarAposPausa} />;
  }

  const totalPalavras = palavras.length;
  const atrasoOpcoesBase =
    ATRASO_INICIO_PALAVRAS_MS + totalPalavras * INTERVALO_PALAVRAS_MS + ATRASO_OPCOES_APOS_PALAVRAS_MS;
  const n = normalize(totals(perguntas, sessao.respostas, sessao.climaAnterior));
  const tokens = n && ehModoClaro(n.clareira) ? CORES.claro : CORES.escuro;

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo} />
      <View style={styles.topo}>
        <Pressable onPress={voltar} hitSlop={16}>
          <Text style={[styles.voltar, { color: tokens.tinta }]}>‹</Text>
        </Pressable>
        <View style={[styles.progressoTrilho, { backgroundColor: tokens.fio }]}>
          <View
            style={[
              styles.progressoPreenchido,
              { width: `${((indiceAtual + 1) / perguntas.length) * 100}%`, backgroundColor: tokens.tinta },
            ]}
          />
        </View>
        <Text style={[styles.progressoRotulo, { color: tokens.tintaSecundaria }]}>
          {t('checkin.progresso', {
            dimensao: textoLocalizado(pergunta.dimensao, idioma),
            n: indiceAtual + 1,
            total: perguntas.length,
          })}
        </Text>
      </View>

      <View key={pergunta.id} style={styles.conteudo}>
        <Animated.View style={[styles.blocoPergunta, estiloBloco]}>
          <Text style={[styles.textoPergunta, { color: tokens.tinta }]}>
            {palavras.map((palavra, i) => (
              <Animated.Text
                key={i}
                entering={
                  reduzirMovimento
                    ? undefined
                    : FadeIn.delay(ATRASO_INICIO_PALAVRAS_MS + i * INTERVALO_PALAVRAS_MS).duration(DURACAO_PALAVRA_MS)
                }
                style={[styles.textoPergunta, { color: tokens.tinta }]}
              >
                {palavra}{' '}
              </Animated.Text>
            ))}
          </Text>

          <View style={styles.opcoes}>
            {ordem
              .filter((indiceOriginal) => opcaoEscolhida === null || indiceOriginal === opcaoEscolhida)
              .map((indiceOriginal, posicao) => {
                const opcao = pergunta.opcoes[indiceOriginal];
                const escolhida = opcaoEscolhida === indiceOriginal;
                return (
                  <Animated.View
                    key={opcao.id}
                    entering={
                      reduzirMovimento
                        ? undefined
                        : FadeIn.delay(atrasoOpcoesBase + posicao * INTERVALO_OPCOES_MS).duration(DURACAO_OPCAO_MS)
                    }
                    exiting={!reduzirMovimento ? FadeOut.duration(DURACAO_SAIDA_OPCAO_MS) : undefined}
                  >
                    <Pressable
                      disabled={fase !== 'idle'}
                      onPress={() => {
                        setOpcaoEscolhida(indiceOriginal);
                        finalizarPergunta(indiceOriginal);
                      }}
                      style={[styles.opcao, { borderBottomColor: tokens.fio }, escolhida && { borderBottomColor: tokens.tinta }]}
                    >
                      <Text style={[styles.opcaoTexto, { color: tokens.tintaSecundaria }]}>
                        {textoLocalizado(opcao.texto, idioma)}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topo: {
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  voltar: {
    color: CORES.escuro.tinta,
    fontSize: 28,
    marginBottom: 8,
  },
  progressoTrilho: {
    width: 96,
    height: 2,
    borderRadius: 1,
    backgroundColor: CORES.escuro.fio,
    overflow: 'hidden',
  },
  progressoPreenchido: {
    height: '100%',
    backgroundColor: CORES.escuro.tinta,
  },
  progressoRotulo: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.rotulo,
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  blocoPergunta: {
    gap: 24,
  },
  textoPergunta: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.tituloTela,
    fontSize: 26,
    lineHeight: 33,
  },
  opcoes: {
    gap: 4,
  },
  opcao: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CORES.escuro.fio,
  },
  opcaoTexto: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.corpo,
  },
});
