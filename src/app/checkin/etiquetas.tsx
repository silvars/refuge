import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useCheckinSessao } from '@/checkin/sessao';
import { getEtiquetas } from '@/conteudo';
import type { ConteudoEtiquetas } from '@/conteudo/tipos';
import { definirMisturaTrilha } from '@/audio/trilha';
import { normalize, totals } from '@/domain/clima';
import type { Pesos } from '@/domain/tipos';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_BOTAO, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// "O que mexeu com você" (ver especificação F4): tela opcional após a P8. "nada_em_especial" é
// exclusiva — escolhê-la limpa as demais, e escolher qualquer outra a desmarca.

const ID_NADA_EM_ESPECIAL = 'nada_em_especial';

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Etiquetas() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const sessao = useCheckinSessao((s) => s.sessao);
  const perguntas = useCheckinSessao((s) => s.perguntas);
  const definirEtiquetas = useCheckinSessao((s) => s.definirEtiquetas);

  const [conteudo, setConteudo] = useState<ConteudoEtiquetas | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [retPular, setRetPular] = useState<RetanguloLayout | null>(null);
  const [retVer, setRetVer] = useState<RetanguloLayout | null>(null);
  const [retChips, setRetChips] = useState<Record<string, RetanguloLayout>>({});
  const refPular = useRef<ElementRef<typeof Pressable>>(null);
  const refVer = useRef<ElementRef<typeof Pressable>>(null);
  const refsChips = useRef<Record<string, ElementRef<typeof Pressable> | null>>({});

  const pesosAlvo = useSharedValue<Pesos>({ tempestade: 0, nevoa: 0, clareira: 0 });
  const esmaecidoAlvo = useSharedValue(false);

  useEffect(() => {
    getEtiquetas().then(setConteudo);
  }, []);

  useEffect(() => {
    if (!sessao) return;
    const mistura = totals(perguntas, sessao.respostas, sessao.climaAnterior);
    pesosAlvo.value = mistura;
    definirMisturaTrilha(mistura);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao]);

  function alternar(id: string) {
    setSelecionadas((atual) => {
      if (id === ID_NADA_EM_ESPECIAL) {
        return atual.includes(id) ? [] : [ID_NADA_EM_ESPECIAL];
      }
      const semExclusiva = atual.filter((s) => s !== ID_NADA_EM_ESPECIAL);
      return semExclusiva.includes(id) ? semExclusiva.filter((s) => s !== id) : [...semExclusiva, id];
    });
  }

  /**
   * Mede TODOS os chips de uma vez, disparado pelo onLayout do container (que só assenta depois
   * que o flex-wrap de todos os filhos já terminou) — evita que medições individuais por chip
   * (uma por `onLayout` de cada Pressable) cheguem fora de ordem e sobrescrevam posições corretas
   * com posições de um reflow anterior (foi o que causava os vidros das linhas sobrepostos).
   */
  function medirTodosOsChips() {
    if (!conteudo) return;
    const pendentes = conteudo.opcoes.map(
      (opcao) =>
        new Promise<[string, RetanguloLayout] | null>((resolve) => {
          const ref = refsChips.current[opcao.id];
          if (!ref) {
            resolve(null);
            return;
          }
          ref.measureInWindow((x, y, largura, altura) => resolve([opcao.id, { x, y, largura, altura }]));
        }),
    );
    Promise.all(pendentes).then((resultados) => {
      const novo: Record<string, RetanguloLayout> = {};
      for (const r of resultados) {
        if (r) novo[r[0]] = r[1];
      }
      setRetChips(novo);
    });
  }

  function continuar(ids: string[]) {
    definirEtiquetas(ids);
    router.push('/checkin/resultado');
  }

  const n = sessao ? normalize(totals(perguntas, sessao.respostas, sessao.climaAnterior)) : null;
  const tokens = n && ehModoClaro(n.clareira) ? CORES.claro : CORES.escuro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens, aoVoltar: () => router.back() });

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {barraVidro}
        {Object.entries(retChips).map(([id, ret]) => {
          const ativa = selecionadas.includes(id);
          return (
            <VidroGrupo
              key={id}
              {...ret}
              raio={RAIO_BOTAO}
              cor={ativa ? tokens.vidroForte : tokens.vidro}
              corFio={ativa ? tokens.tinta : tokens.fio}
            />
          );
        })}
        {retPular && <VidroGrupo {...retPular} raio={RAIO_BOTAO} cor={tokens.vidro} corFio={tokens.fio} />}
        {retVer && <VidroGrupo {...retVer} raio={RAIO_BOTAO} cor={tokens.vidroForte} corFio={tokens.fio} />}
      </FundoClima>
      {barra}

      {conteudo && (
        <>
          <Text style={[styles.titulo, { color: tokens.tinta }]}>{textoLocalizado(conteudo.titulo, idioma)}</Text>
          <View style={styles.chips} onLayout={medirTodosOsChips}>
            {conteudo.opcoes.map((opcao) => (
              <Pressable
                key={opcao.id}
                ref={(ref) => {
                  refsChips.current[opcao.id] = ref;
                }}
                onPress={() => alternar(opcao.id)}
                style={styles.chip}
              >
                <Text style={[styles.chipTexto, { color: tokens.tinta }]}>{opcao[idioma] ?? opcao['pt-BR'] ?? ''}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={styles.botoes}>
        <Pressable
          ref={refPular}
          onPress={() => continuar([])}
          style={styles.botaoSecundario}
          onLayout={() => {
            refPular.current?.measureInWindow((x, y, largura, altura) => setRetPular({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('etiquetas.pular')}</Text>
        </Pressable>
        <Pressable
          ref={refVer}
          onPress={() => continuar(selecionadas)}
          style={styles.botao}
          onLayout={() => {
            refVer.current?.measureInWindow((x, y, largura, altura) => setRetVer({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('etiquetas.verMeuClima')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  titulo: {
    color: CORES.escuro.tinta,
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  chipTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.corpo,
  },
  botoes: {
    flexDirection: 'row',
    gap: 16,
  },
  botao: {
    height: 52,
    paddingHorizontal: 32,
    borderRadius: RAIO_BOTAO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoSecundario: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: RAIO_BOTAO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
});
