import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useCheckinSessao } from '@/checkin/sessao';
import { getEstados, getEtiquetas, getFrases } from '@/conteudo';
import type { Frase, LinhaConteudo } from '@/conteudo/tipos';
import { frasesElegiveis, escolherFrase } from '@/conteudo/selecaoFrases';
import { definirMisturaTrilha } from '@/audio/trilha';
import { finish, KEYS } from '@/domain/clima';
import type { Checkin, Clima, Pesos } from '@/domain/tipos';
import { abrirBanco } from '@/data/db';
import { foiFraseExibidaRecentemente, registrarFraseExibida } from '@/data/repositorios';
import { hapticRevelarClima } from '@/haptics';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { useRefugioStore } from '@/store';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_BOTAO, RAIO_CARD, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Resultado do check-in (ver especificação F5; 02-sdd.md, seção 5): fecha a sessão, grava o
// Checkin real no banco e mostra clima + mistura + etiquetas + frase do dia.

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Resultado() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const sessao = useCheckinSessao((s) => s.sessao);
  const perguntas = useCheckinSessao((s) => s.perguntas);
  const etiquetasEscolhidas = useCheckinSessao((s) => s.etiquetas);
  const limparSessao = useCheckinSessao((s) => s.limpar);
  const vibracaoLigada = useRefugioStore((s) => s.preferencias.vibracao);
  const linhas = useRefugioStore((s) => s.preferencias.linhas);
  const registrarCheckin = useRefugioStore((s) => s.registrarCheckin);

  const pesosAlvo = useSharedValue<Pesos>({ tempestade: 0, nevoa: 0, clareira: 0 });
  const esmaecidoAlvo = useSharedValue(false);
  const [nomeClima, setNomeClima] = useState('');
  const [descricaoClima, setDescricaoClima] = useState('');
  const [mistura, setMistura] = useState<{ clima: Clima; pct: number; nome: string }[]>([]);
  const [etiquetasTexto, setEtiquetasTexto] = useState<string[]>([]);
  const [frase, setFrase] = useState<Frase | null>(null);
  const [retBotao, setRetBotao] = useState<RetanguloLayout | null>(null);
  const [modoClaro, setModoClaro] = useState(false);
  const gravouRef = useRef(false);

  useEffect(() => {
    if (!sessao || perguntas.length === 0 || gravouRef.current) return;
    gravouRef.current = true;

    (async () => {
      const respostas = sessao.respostas.map((r) => r ?? 0);
      const { mood, mix } = finish(perguntas, respostas);
      pesosAlvo.value = { tempestade: mix.tempestade / 100, nevoa: mix.nevoa / 100, clareira: mix.clareira / 100 };
      definirMisturaTrilha(pesosAlvo.value);
      setModoClaro(ehModoClaro(mix.clareira / 100));

      if (vibracaoLigada) hapticRevelarClima().catch(() => {});

      const estados = await getEstados();
      setNomeClima(textoLocalizado(estados.estados[mood].nome, idioma));
      setDescricaoClima(textoLocalizado(estados.estados[mood].descricao, idioma));

      const ordenada = KEYS.map((clima) => ({
        clima,
        pct: mix[clima],
        nome: textoLocalizado(estados.estados[clima].nome, idioma),
      }))
        .filter((m) => m.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      setMistura(ordenada.length > 1 ? ordenada : []);

      const etiquetas = await getEtiquetas();
      setEtiquetasTexto(
        etiquetasEscolhidas
          .map((id) => etiquetas.opcoes.find((o) => o.id === id))
          .filter((o): o is NonNullable<typeof o> => !!o)
          .map((o) => o[idioma] ?? o['pt-BR'] ?? ''),
      );

      const linhasAtivas: LinhaConteudo[] = (['neutra', 'espiritual', 'filosofica'] as const).filter((l) => linhas[l]);
      const db = await abrirBanco();
      const agora = Date.now();
      const conteudoFrases = await getFrases();
      const elegiveis = frasesElegiveis(conteudoFrases.frases, {
        clima: mood,
        uso: 'tela',
        linhasAtivas,
        idioma,
      });
      const naoRepetidas = (
        await Promise.all(
          elegiveis.map(async (f) => ({
            f,
            recente: await foiFraseExibidaRecentemente(db, f.id, f.nao_repetir_dias ?? 0, agora),
          })),
        )
      )
        .filter((x) => !x.recente)
        .map((x) => x.f);
      const escolhida = escolherFrase(naoRepetidas.length > 0 ? naoRepetidas : elegiveis);
      if (escolhida) {
        setFrase(escolhida);
        await registrarFraseExibida(db, escolhida.id, agora);
      }

      const checkin: Checkin = {
        id: sessao.id,
        em: agora,
        clima: mood,
        mistura: mix,
        respostas: perguntas.map((p, i) => ({ perguntaId: p.id, opcaoId: p.opcoes[respostas[i]].id })),
        etiquetas: etiquetasEscolhidas,
      };
      await registrarCheckin(checkin);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function irParaRefugio() {
    limparSessao();
    router.replace('/');
  }

  const tokens = modoClaro ? CORES.claro : CORES.escuro;

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {frase && (
          <VidroGrupo x={24} y={height - 220} largura={width - 48} altura={96} raio={RAIO_CARD} cor={tokens.vidro} corFio={tokens.fio} />
        )}
        {retBotao && <VidroGrupo {...retBotao} raio={RAIO_BOTAO} cor={tokens.vidroForte} corFio={tokens.fio} />}
      </FundoClima>

      <View style={styles.conteudo}>
        <Text style={[styles.rotulo, { color: tokens.tintaSecundaria }]}>{t('resultado.seuClimaAgora')}</Text>
        <Text style={[styles.nomeClima, { color: tokens.tinta }]}>{nomeClima}</Text>
        <Text style={[styles.descricao, { color: tokens.tintaSecundaria }]}>{descricaoClima}</Text>

        {mistura.length > 0 && (
          <Text style={[styles.mistura, { color: tokens.tintaSecundaria }]}>
            {t('resultado.misturaTitulo')}: {mistura.map((m) => `${m.nome} ${m.pct}%`).join(' · ')}
          </Text>
        )}

        {etiquetasTexto.length > 0 && (
          <Text style={[styles.etiquetas, { color: tokens.tintaSecundaria }]}>
            {t('resultado.oQueMexeu')}: {etiquetasTexto.join(', ')}
          </Text>
        )}
      </View>

      {frase && (
        <View style={styles.cardFrase} pointerEvents="none">
          <Text style={[styles.textoFrase, { color: tokens.tinta }]}>{textoLocalizado(frase.texto, idioma)}</Text>
        </View>
      )}

      <Pressable
        onPress={irParaRefugio}
        style={styles.botao}
        onLayout={(e) => {
          const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
          setRetBotao({ x, y, largura, altura });
        }}
      >
        <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('resultado.irParaRefugio')}</Text>
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
  conteudo: {
    alignItems: 'center',
    gap: 8,
  },
  rotulo: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.rotulo,
  },
  nomeClima: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.nomeClima,
  },
  descricao: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.corpo,
  },
  mistura: {
    color: CORES.escuro.tintaSecundaria,
    textAlign: 'center',
    ...TIPOGRAFIA.rotulo,
    marginTop: 12,
  },
  etiquetas: {
    color: CORES.escuro.tintaSecundaria,
    textAlign: 'center',
    ...TIPOGRAFIA.rotulo,
  },
  cardFrase: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 220 - 96,
    height: 96,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  textoFrase: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.corpo,
  },
  botao: {
    height: 52,
    paddingHorizontal: 40,
    borderRadius: RAIO_BOTAO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
});
