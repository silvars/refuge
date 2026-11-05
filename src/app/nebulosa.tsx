import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { getEstados, getEtiquetas } from '@/conteudo';
import { KEYS } from '@/domain/clima';
import type { Clima, Pesos, ResumoDia } from '@/domain/tipos';
import { abrirBanco } from '@/data/db';
import { diaDoMes, numeroDeDiasNoMes, resumoSemana, semanasDoMes } from '@/data/dominio';
import { resumosDoMesRepositorio } from '@/data/repositorios';
import { useReduzirMovimento } from '@/hooks/useReduzirMovimento';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { useRefugioStore } from '@/store';
import { diaMaisProximo } from '@/visual/nebulosaGeometria';
import { FundoClima } from '@/visual/FundoClima';
import { NebulosaGrupo } from '@/visual/Nebulosa';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, CORES_ESTRELA, RAIO_CARD, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Minha Nebulosa (ver especificação F9; 02-sdd.md, seção 7.5): histórico afetivo do mês corrente,
// sem gráficos — uma estrela por dia numa espiral. Navegação entre meses e visão em lista para
// leitores de tela ficaram para a "fase seguinte" (02-sdd.md, seção 7.5), assim como apagar um
// dia/todo o histórico (critério de aceite, mas depende da tela de Ajustes da Fase 6). Frase do
// dia na memória do dia também não entrou nesta versão — exigiria uma nova tabela/consulta
// ligando frase_exibida a um checkin específico, fora do escopo desta primeira entrega.

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

const LARGURA_CARD_FRACAO_ALTURA = 330 / 342;

export default function Nebulosa() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const reduzirMovimento = useReduzirMovimento();

  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);

  const hoje = useMemo(() => new Date(), []);
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const diaDeHoje = hoje.getDate();
  const numDias = numeroDeDiasNoMes(ano, mes);
  const anoMes = `${ano}-${String(mes).padStart(2, '0')}`;

  const [resumos, setResumos] = useState<Record<string, ResumoDia>>({});
  const [nomesClima, setNomesClima] = useState<Record<Clima, string> | null>(null);
  const [etiquetasMapa, setEtiquetasMapa] = useState<Record<string, string>>({});
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [retCard, setRetCard] = useState<RetanguloLayout | null>(null);
  const refCard = useRef<ElementRef<typeof Pressable>>(null);

  useEffect(() => {
    (async () => {
      const db = await abrirBanco();
      const [resumosDoMes, estados, etiquetas] = await Promise.all([
        resumosDoMesRepositorio(db, anoMes),
        getEstados(),
        getEtiquetas(),
      ]);
      setResumos(resumosDoMes);
      const nomes = {} as Record<Clima, string>;
      KEYS.forEach((clima) => {
        nomes[clima] = textoLocalizado(estados.estados[clima].nome, idioma);
      });
      setNomesClima(nomes);
      const mapaEtiquetas: Record<string, string> = {};
      etiquetas.opcoes.forEach((o) => {
        mapaEtiquetas[o.id] = o[idioma] ?? o['pt-BR'] ?? '';
      });
      setEtiquetasMapa(mapaEtiquetas);
    })();
  }, [anoMes, idioma]);

  const diasDoMes = useMemo(
    () => Array.from({ length: numDias }, (_, i) => resumos[diaDoMes(ano, mes, i + 1)] ?? null),
    [resumos, ano, mes, numDias],
  );
  const diasParaNebulosa = diasDoMes.slice(0, diaDeHoje);
  const semanas = useMemo(() => semanasDoMes(ano, mes), [ano, mes]);

  const semanaDeHoje = semanas.find(([inicio, fim]) => diaDeHoje >= inicio && diaDeHoje <= fim) ?? null;
  const contagemSemana = semanaDeHoje ? resumoSemana(resumos, ano, mes, semanaDeHoje) : { tempestade: 0, nevoa: 0, clareira: 0 };
  const textoResumoSemana = (['clareira', 'nevoa', 'tempestade'] as Clima[])
    .filter((clima) => contagemSemana[clima] > 0)
    .map((clima) => `${nomesClima?.[clima] ?? clima} ${t('nebulosa.emDias', { count: contagemSemana[clima] })}`)
    .join(' · ');

  const resumoSelecionado = diaSelecionado ? diasDoMes[diaSelecionado - 1] : null;

  const pesosAlvo = useSharedValue<Pesos>({ tempestade: 0, nevoa: 0, clareira: 0 });
  const esmaecidoAlvo = useSharedValue(false);

  useEffect(() => {
    const { misturaAtual, esmaecido } = estadoDerivado;
    esmaecidoAlvo.value = esmaecido;
    pesosAlvo.value = misturaAtual
      ? { tempestade: misturaAtual.tempestade / 100, nevoa: misturaAtual.nevoa / 100, clareira: misturaAtual.clareira / 100 }
      : { tempestade: 0, nevoa: 0, clareira: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoDerivado]);

  const emModoClaro = !estadoDerivado.esmaecido && !!estadoDerivado.misturaAtual && ehModoClaro(estadoDerivado.misturaAtual.clareira / 100);
  const tokens = emModoClaro ? CORES.claro : CORES.escuro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens, aoVoltar: () => router.back() });

  function aoTocarNaNebulosa(localX: number, localY: number) {
    if (!retCard) return;
    const dia = diaMaisProximo(localX, localY, diaDeHoje, retCard.largura, retCard.altura);
    setDiaSelecionado(dia);
  }

  const tituloMes = new Intl.DateTimeFormat(idioma, { month: 'long', year: 'numeric' }).format(hoje);
  const tituloDia = resumoSelecionado
    ? new Intl.DateTimeFormat(idioma, { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(ano, mes - 1, diaSelecionado ?? 1),
      )
    : null;

  const misturaOrdenada = resumoSelecionado
    ? KEYS.map((clima) => ({ clima, pct: resumoSelecionado.misturaMedia[clima], nome: nomesClima?.[clima] ?? clima }))
        .filter((m) => m.pct > 0)
        .sort((a, b) => b.pct - a.pct)
    : [];
  const etiquetasDoDia = resumoSelecionado
    ? resumoSelecionado.etiquetas.map((id) => etiquetasMapa[id]).filter((texto): texto is string => !!texto)
    : [];

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {barraVidro}
        {retCard && (
          <NebulosaGrupo
            {...retCard}
            dias={diasParaNebulosa}
            semanas={semanas}
            diaDeHoje={diaDeHoje}
            diaSelecionado={diaSelecionado}
            reduzirMovimento={reduzirMovimento}
          />
        )}
        {resumoSelecionado && (
          <VidroGrupo x={24} y={(retCard?.y ?? 0) + (retCard?.altura ?? 0) + 76} largura={width - 48} altura={180} raio={RAIO_CARD} cor={tokens.vidro} corFio={tokens.fio} />
        )}
      </FundoClima>
      {barra}

      <View style={styles.conteudo}>
        <Text style={[styles.titulo, { color: tokens.tinta }]}>{t('nebulosa.titulo')}</Text>
        <Text style={[styles.subtitulo, { color: tokens.tintaSecundaria }]}>{tituloMes}</Text>

        <Pressable
          ref={refCard}
          style={[styles.card, { aspectRatio: 1 / LARGURA_CARD_FRACAO_ALTURA }]}
          accessibilityLabel={`${t('nebulosa.titulo')}. ${textoResumoSemana || t('nebulosa.semRegistroNaSemana')}`}
          onPress={(e) => aoTocarNaNebulosa(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          onLayout={() => {
            refCard.current?.measureInWindow((x, y, largura, altura) => setRetCard({ x, y, largura, altura }));
          }}
        />

        <View style={styles.legenda}>
          {KEYS.map((clima) => (
            <View key={clima} style={styles.legendaItem}>
              <View style={[styles.legendaPonto, { backgroundColor: CORES_ESTRELA[clima] }]} />
              <Text style={[styles.legendaTexto, { color: tokens.tintaSecundaria }]}>{nomesClima?.[clima] ?? ''}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.resumoSemana, { color: tokens.tintaSecundaria }]}>
          {textoResumoSemana ? t('nebulosa.resumoSemanaPrefixo', { resumo: textoResumoSemana }) : t('nebulosa.semRegistroNaSemana')}
        </Text>

        {!resumoSelecionado && <Text style={[styles.dica, { color: tokens.tintaSecundaria }]}>{t('nebulosa.dica')}</Text>}

        {resumoSelecionado && (
          <View style={styles.detalhe} pointerEvents="none">
            <Text style={[styles.detalheData, { color: tokens.tintaSecundaria }]}>{tituloDia}</Text>
            <Text style={[styles.detalheClima, { color: tokens.tinta }]}>{nomesClima?.[resumoSelecionado.climaPredominante ?? 'nevoa']}</Text>
            {misturaOrdenada.length > 1 && (
              <Text style={[styles.detalheTexto, { color: tokens.tintaSecundaria }]}>
                {misturaOrdenada.map((m) => `${m.nome} ${m.pct}%`).join(' · ')}
              </Text>
            )}
            {etiquetasDoDia.length > 0 && (
              <Text style={[styles.detalheTexto, { color: tokens.tinta }]}>
                {t('resultado.oQueMexeu')}: {etiquetasDoDia.join(', ')}
              </Text>
            )}
            <Text style={[styles.detalheTexto, { color: tokens.tintaSecundaria }]}>
              {t('nebulosa.checkins', { count: resumoSelecionado.contagem })}
            </Text>
            {resumoSelecionado.portoSeguro && (
              <Text style={[styles.detalheTexto, { color: tokens.tinta }]}>{t('nebulosa.portoSeguroNesteDia')}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingTop: 112,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  titulo: {
    ...TIPOGRAFIA.tituloTela,
    alignSelf: 'flex-start',
  },
  subtitulo: {
    ...TIPOGRAFIA.corpo,
    alignSelf: 'flex-start',
    textTransform: 'capitalize',
  },
  card: {
    width: '100%',
    marginTop: 8,
  },
  legenda: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaPonto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendaTexto: {
    ...TIPOGRAFIA.rotulo,
  },
  resumoSemana: {
    ...TIPOGRAFIA.corpo,
    alignSelf: 'flex-start',
  },
  dica: {
    ...TIPOGRAFIA.rotulo,
    alignSelf: 'flex-start',
  },
  detalhe: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 2,
  },
  detalheData: {
    ...TIPOGRAFIA.rotulo,
  },
  detalheClima: {
    ...TIPOGRAFIA.tituloTela,
    fontSize: 22,
  },
  detalheTexto: {
    ...TIPOGRAFIA.corpo,
  },
});
