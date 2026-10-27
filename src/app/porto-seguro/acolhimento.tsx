import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PausaRespiracao } from '@/checkin/PausaRespiracao';
import type { Clima, Pesos } from '@/domain/tipos';
import { useRefugioStore } from '@/store';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_BOTAO, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Tela de acolhimento, logo após voltar do WhatsApp/SMS (ver especificação F8, item 8): sem
// guardar o contato, só o primeiro nome (passado via parâmetro de rota) pra personalizar o texto.

const CLIMA_PADRAO: Clima = 'nevoa';

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Acolhimento() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { nome } = useLocalSearchParams<{ nome?: string }>();

  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);
  const clima = estadoDerivado.climaAtual ?? CLIMA_PADRAO;
  const misturaAtual = estadoDerivado.misturaAtual ?? { tempestade: 0, nevoa: 100, clareira: 0 };

  const pesosAlvo = useSharedValue<Pesos>({
    tempestade: misturaAtual.tempestade / 100,
    nevoa: misturaAtual.nevoa / 100,
    clareira: misturaAtual.clareira / 100,
  });
  const esmaecidoAlvo = useSharedValue(false);

  const [mostrarPausa, setMostrarPausa] = useState(false);
  const [retRespirar, setRetRespirar] = useState<RetanguloLayout | null>(null);
  const [retVoltar, setRetVoltar] = useState<RetanguloLayout | null>(null);
  const refRespirar = useRef<ElementRef<typeof Pressable>>(null);
  const refVoltar = useRef<ElementRef<typeof Pressable>>(null);

  function irParaRefugio() {
    router.replace('/');
  }

  if (mostrarPausa) {
    return <PausaRespiracao clima={clima} rotulo={t('pausa.rotuloPortoSeguro')} aoContinuar={irParaRefugio} />;
  }

  const modoClaro = !estadoDerivado.esmaecido && ehModoClaro(misturaAtual.clareira / 100);
  const tokens = modoClaro ? CORES.claro : CORES.escuro;

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {retRespirar && <VidroGrupo {...retRespirar} raio={RAIO_BOTAO} cor={tokens.vidroForte} corFio={tokens.fio} />}
        {retVoltar && <VidroGrupo {...retVoltar} raio={RAIO_BOTAO} cor={tokens.vidro} corFio={tokens.fio} />}
      </FundoClima>

      <View style={styles.conteudo}>
        <Text style={[styles.titulo, { color: tokens.tinta }]}>{t('acolhimento.titulo')}</Text>
        <Text style={[styles.subtitulo, { color: tokens.tintaSecundaria }]}>
          {nome ? t('acolhimento.subtitulo', { nome }) : t('acolhimento.subtituloSemNome')}
        </Text>
      </View>

      <View style={styles.botoes}>
        <Pressable
          ref={refRespirar}
          onPress={() => setMostrarPausa(true)}
          style={styles.botao}
          onLayout={() => {
            refRespirar.current?.measureInWindow((x, y, largura, altura) => setRetRespirar({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('acolhimento.respirar')}</Text>
        </Pressable>
        <Pressable
          ref={refVoltar}
          onPress={irParaRefugio}
          style={styles.botao}
          onLayout={() => {
            refVoltar.current?.measureInWindow((x, y, largura, altura) => setRetVoltar({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('acolhimento.voltar')}</Text>
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
    gap: 40,
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  conteudo: {
    alignItems: 'center',
    gap: 12,
  },
  titulo: {
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 24,
  },
  subtitulo: {
    textAlign: 'center',
    ...TIPOGRAFIA.corpo,
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
