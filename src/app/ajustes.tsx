import { useRouter } from 'expo-router';
import { useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { biometriaDisponivel } from '@/components/TelaBloqueio';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { abrirBanco } from '@/data/db';
import type { Pesos } from '@/domain/tipos';
import { IDIOMAS_SUPORTADOS, trocarIdioma, type Idioma } from '@/i18n';
import { useRefugioStore } from '@/store';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_CARD, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Tela de Ajustes (ver especificação F10; 02-sdd.md, seção 10): interruptores de linhas de
// conteúdo, som, vibração, lembretes, mensagens de apoio e bloqueio; seletor de idioma; apagar
// todos os dados; link pra Sobre. Só acessível a partir da tela principal (useBarraSuperior).

const NOMES_IDIOMA: Record<Idioma, string> = { 'pt-BR': 'Português', en: 'English', fr: 'Français', es: 'Español' };

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Ajustes() {
  const { t, i18n } = useTranslation();
  const idiomaAtivo = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const preferencias = useRefugioStore((s) => s.preferencias);
  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);
  const atualizarPreferencias = useRefugioStore((s) => s.atualizarPreferencias);
  const apagarTudo = useRefugioStore((s) => s.apagarTudo);
  const misturaAtual = estadoDerivado.misturaAtual ?? { tempestade: 0, nevoa: 100, clareira: 0 };

  const pesosAlvo = useSharedValue<Pesos>({
    tempestade: misturaAtual.tempestade / 100,
    nevoa: misturaAtual.nevoa / 100,
    clareira: misturaAtual.clareira / 100,
  });
  const esmaecidoAlvo = useSharedValue(estadoDerivado.esmaecido);

  const [retCard, setRetCard] = useState<RetanguloLayout | null>(null);
  const refCard = useRef<ElementRef<typeof View>>(null);

  const emModoClaro = !estadoDerivado.esmaecido && !!estadoDerivado.misturaAtual && ehModoClaro(estadoDerivado.misturaAtual.clareira / 100);
  const tokens = emModoClaro ? CORES.claro : CORES.escuro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens, aoVoltar: () => router.back() });

  async function aoLigarBloqueio(ligado: boolean) {
    if (ligado && !(await biometriaDisponivel())) {
      Alert.alert(t('ajustes.bloqueio.semBiometria'));
      return;
    }
    atualizarPreferencias({ bloqueio: ligado });
  }

  async function aoTrocarIdioma(idioma: Idioma) {
    if (idioma === idiomaAtivo) return;
    const db = await abrirBanco();
    await trocarIdioma(idioma, db);
  }

  function aoConfirmarApagarTudo() {
    Alert.alert(t('ajustes.apagarTudoConfirmaTitulo'), t('ajustes.apagarTudoConfirmaTexto'), [
      { text: t('ajustes.apagarTudoCancelar'), style: 'cancel' },
      { text: t('ajustes.apagarTudoConfirmar'), style: 'destructive', onPress: () => apagarTudo() },
    ]);
  }

  const interruptores: {
    chave: string;
    rotulo: string;
    valor: boolean;
    aoMudar: (v: boolean) => void;
  }[] = [
    {
      chave: 'neutra',
      rotulo: t('ajustes.linhaNeutra'),
      valor: preferencias.linhas.neutra,
      aoMudar: (v) => atualizarPreferencias({ linhas: { ...preferencias.linhas, neutra: v } }),
    },
    {
      chave: 'espiritual',
      rotulo: t('ajustes.linhaEspiritual'),
      valor: preferencias.linhas.espiritual,
      aoMudar: (v) => atualizarPreferencias({ linhas: { ...preferencias.linhas, espiritual: v } }),
    },
    {
      chave: 'filosofica',
      rotulo: t('ajustes.linhaFilosofica'),
      valor: preferencias.linhas.filosofica,
      aoMudar: (v) => atualizarPreferencias({ linhas: { ...preferencias.linhas, filosofica: v } }),
    },
    { chave: 'som', rotulo: t('ajustes.som'), valor: preferencias.som, aoMudar: (v) => atualizarPreferencias({ som: v }) },
    {
      chave: 'vibracao',
      rotulo: t('ajustes.vibracao'),
      valor: preferencias.vibracao,
      aoMudar: (v) => atualizarPreferencias({ vibracao: v }),
    },
    {
      chave: 'lembretes',
      rotulo: t('ajustes.lembretes'),
      valor: preferencias.lembretes,
      aoMudar: (v) => atualizarPreferencias({ lembretes: v }),
    },
    {
      chave: 'mensagensApoio',
      rotulo: t('ajustes.mensagensApoio'),
      valor: preferencias.mensagensApoio,
      aoMudar: (v) => atualizarPreferencias({ mensagensApoio: v }),
    },
    { chave: 'bloqueio', rotulo: t('ajustes.bloqueio.titulo'), valor: preferencias.bloqueio, aoMudar: aoLigarBloqueio },
  ];

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {barraVidro}
        {retCard && <VidroGrupo {...retCard} raio={RAIO_CARD} cor={tokens.vidro} corFio={tokens.fio} />}
      </FundoClima>
      {barra}

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={[styles.titulo, { color: tokens.tinta }]}>{t('ajustes.titulo')}</Text>

        <View
          ref={refCard}
          style={styles.card}
          onLayout={(e) => {
            const { x, y, width: largura, height: altura } = e.nativeEvent.layout;
            setRetCard({ x, y, largura, altura });
          }}
        >
          {interruptores.map((item, i) => (
            <View key={item.chave} style={[styles.linha, i === interruptores.length - 1 && styles.linhaSemBorda, { borderColor: tokens.fio }]}>
              <Text style={[styles.linhaTexto, { color: tokens.tinta }]}>{item.rotulo}</Text>
              <Switch value={item.valor} onValueChange={item.aoMudar} />
            </View>
          ))}
        </View>

        <Text style={[styles.rotuloSecao, { color: tokens.tintaSecundaria }]}>{t('ajustes.idioma')}</Text>
        <View style={styles.idiomas}>
          {IDIOMAS_SUPORTADOS.map((idioma) => (
            <Pressable
              key={idioma}
              onPress={() => aoTrocarIdioma(idioma)}
              style={[
                styles.pilulaIdioma,
                { borderColor: tokens.fio },
                idioma === idiomaAtivo && { backgroundColor: tokens.vidroForte },
              ]}
            >
              <Text style={[styles.idiomaTexto, { color: tokens.tinta }]}>{NOMES_IDIOMA[idioma]}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={aoConfirmarApagarTudo} style={styles.botaoApagar}>
          <Text style={[styles.botaoApagarTexto, { color: tokens.tinta }]}>{t('ajustes.apagarTudo')}</Text>
        </Pressable>
        <Text style={[styles.rodape, { color: tokens.tintaSecundaria }]}>{t('ajustes.rodape')}</Text>

        <Pressable onPress={() => router.push('/sobre')}>
          <Text style={[styles.linkSobre, { color: tokens.tintaSecundaria }]}>{t('ajustes.sobre')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    gap: 16,
    paddingTop: 112,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  titulo: {
    ...TIPOGRAFIA.tituloTela,
  },
  card: {
    borderRadius: RAIO_CARD,
    overflow: 'hidden',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linhaSemBorda: {
    borderBottomWidth: 0,
  },
  linhaTexto: {
    flex: 1,
    paddingRight: 12,
    ...TIPOGRAFIA.corpo,
  },
  rotuloSecao: {
    ...TIPOGRAFIA.rotulo,
  },
  idiomas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pilulaIdioma: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idiomaTexto: {
    ...TIPOGRAFIA.destaque,
  },
  botaoApagar: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoApagarTexto: {
    ...TIPOGRAFIA.destaque,
  },
  rodape: {
    textAlign: 'center',
    ...TIPOGRAFIA.rotulo,
  },
  linkSobre: {
    textAlign: 'center',
    textDecorationLine: 'underline',
    ...TIPOGRAFIA.rotulo,
  },
});
