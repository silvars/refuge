import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useSharedValue } from 'react-native-reanimated';

import { getRespiracao } from '@/conteudo';
import type { PausaRespiracaoConteudo } from '@/conteudo/tipos';
import type { Clima, Pesos } from '@/domain/tipos';
import { useReduzirMovimento } from '@/hooks/useReduzirMovimento';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { FormaPontosGrupo, type ConfigForma } from '@/visual/FormaPontos';
import { FundoClima } from '@/visual/FundoClima';
import { CORES, RAIO_BOTAO, TIPOGRAFIA } from '@/visual/tokens';

// Pausa de respiração (ver especificação F3; 02-sdd.md, seção 7.4): aparece uma vez por check-in
// (depois da P3) e como "respiro" opcional pós-Porto Seguro. O tipo é definido pelo clima, nunca
// escolhido pela pessoa. A forma de pontos e os rótulos "Inspire…/Solte…" partem do MESMO relógio
// (tempo de montagem desta tela) para ficarem sincronizados.

const PESOS_POR_CLIMA: Record<Clima, Pesos> = {
  tempestade: { tempestade: 1, nevoa: 0, clareira: 0 },
  nevoa: { tempestade: 0, nevoa: 1, clareira: 0 },
  clareira: { tempestade: 0, nevoa: 0, clareira: 1 },
};

const TAMANHO_FORMA = 240;
const INTERVALO_CHECAGEM_FASE_MS = 150;

export interface PausaRespiracaoProps {
  clima: Clima;
  /** "Uma pausa no meio do caminho" (check-in) ou "Um respiro só para você" (pós-Porto Seguro). */
  rotulo: string;
  aoContinuar: () => void;
}

export function PausaRespiracao({ clima, rotulo, aoContinuar }: PausaRespiracaoProps) {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const { width, height } = useWindowDimensions();
  const reduzirMovimento = useReduzirMovimento();

  const [conteudoPausa, setConteudoPausa] = useState<PausaRespiracaoConteudo | null>(null);
  const [faseRespiracao, setFaseRespiracao] = useState<'inspira' | 'expira'>('inspira');
  const [origemForma, setOrigemForma] = useState({ x: 0, y: 0 });
  const pesosAlvo = useSharedValue<Pesos>(PESOS_POR_CLIMA[clima]);
  const esmaecidoAlvo = useSharedValue(false);
  const configAlvo = useSharedValue<ConfigForma>({
    amp: 0.5,
    speed: 0.5,
    rot: 0.15,
    col: [252, 252, 252],
    raioFracao: 0.34,
    respiracao: { periodoS: 8, fracaoInspira: 0.5, escalaMin: 0.62, escalaMax: 1.15 },
  });
  const montadoEmRef = useRef(0);

  useEffect(() => {
    montadoEmRef.current = Date.now();
  }, []);

  useEffect(() => {
    getRespiracao().then((dados) => setConteudoPausa(dados.pausas[clima]));
  }, [clima]);

  useEffect(() => {
    pesosAlvo.value = PESOS_POR_CLIMA[clima];
  }, [clima, pesosAlvo]);

  useEffect(() => {
    if (!conteudoPausa) return;
    const { amplitude, velocidade, rotacao, escala_min: escalaMin, escala_max: escalaMax } = conteudoPausa.forma;
    const periodoS = conteudoPausa.inspira_s + conteudoPausa.expira_s;
    configAlvo.value = {
      amp: amplitude,
      speed: velocidade,
      rot: rotacao,
      col: clima === 'clareira' ? [35, 31, 32] : [252, 252, 252],
      raioFracao: 0.34,
      respiracao: { periodoS, fracaoInspira: conteudoPausa.inspira_s / periodoS, escalaMin, escalaMax },
    };

    if (reduzirMovimento) return;
    const periodoMs = periodoS * 1000;
    const inspiraMs = conteudoPausa.inspira_s * 1000;
    const id = setInterval(() => {
      const u = (Date.now() - montadoEmRef.current) % periodoMs;
      setFaseRespiracao(u < inspiraMs ? 'inspira' : 'expira');
    }, INTERVALO_CHECAGEM_FASE_MS);
    return () => clearInterval(id);
  }, [conteudoPausa, reduzirMovimento, configAlvo, clima]);

  if (!conteudoPausa) {
    return (
      <View style={styles.container}>
        <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo} />
      </View>
    );
  }

  const rotuloRespiracao =
    faseRespiracao === 'inspira'
      ? textoLocalizado(conteudoPausa.rotulo_inspira, idioma)
      : textoLocalizado(conteudoPausa.rotulo_expira, idioma);
  const tokens = clima === 'clareira' ? CORES.claro : CORES.escuro;

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        <FormaPontosGrupo
          tamanho={TAMANHO_FORMA}
          configAlvo={configAlvo}
          reduzirMovimento={reduzirMovimento}
          origem={origemForma}
        />
      </FundoClima>
      <Text style={[styles.rotuloSuperior, { color: tokens.tintaSecundaria }]}>{rotulo}</Text>
      <Text style={[styles.titulo, { color: tokens.tinta }]}>{textoLocalizado(conteudoPausa.titulo, idioma)}</Text>
      <View
        style={styles.espacoForma}
        onLayout={(e) => {
          const { x, y } = e.nativeEvent.layout;
          setOrigemForma({ x, y });
        }}
      />
      <Animated.Text
        key={faseRespiracao}
        entering={reduzirMovimento ? undefined : FadeIn.duration(300)}
        style={[styles.rotuloRespiracao, { color: tokens.tinta }]}
      >
        {rotuloRespiracao}
      </Animated.Text>
      <Text style={[styles.apoio, { color: tokens.tintaSecundaria }]}>{textoLocalizado(conteudoPausa.apoio, idioma)}</Text>
      <Pressable
        onPress={aoContinuar}
        style={[styles.botao, { borderColor: tokens.fio, backgroundColor: tokens.vidroForte }]}
      >
        <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('pausa.continuar')}</Text>
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
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  rotuloSuperior: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.rotulo,
  },
  titulo: {
    color: CORES.escuro.tinta,
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 26,
  },
  espacoForma: {
    width: TAMANHO_FORMA,
    height: TAMANHO_FORMA * 0.75,
  },
  rotuloRespiracao: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
  apoio: {
    color: CORES.escuro.tintaSecundaria,
    textAlign: 'center',
    ...TIPOGRAFIA.corpo,
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
    marginTop: 8,
  },
  botaoTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
});
