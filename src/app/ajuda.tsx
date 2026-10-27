import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';

import { definirVolumeGeralTrilhaSeAtiva } from '@/audio/trilha';
import { pontosDoAngulo } from '@/visual/geometria';
import { CORES, RAIO_BOTAO, RAIO_CARD, TIPOGRAFIA } from '@/visual/tokens';
import { VidroGrupo } from '@/visual/Vidro';

// Tela de ajuda (ver especificação, seção 9.1 — "Protocolo de segurança", requisito de
// lançamento): fundo fixo que NÃO muda com o clima, alto contraste, funciona offline, acessível
// em 1 toque de qualquer tela do app (botão global em useBarraSuperior.tsx).

const DEGRADE_AJUDA = ['#1B1E2E', '#262640', '#2E2A45'];
const PARADAS = [0, 0.55, 1];
const ANGULO_GRAUS = 165;
/** Volume quase zero nesta tela (ver especificação 7.2); restaura o "demais" padrão ao sair. */
const VOLUME_AJUDA = 0.12;
const VOLUME_PADRAO = 0.85;

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function Ajuda() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { inicio, fim } = pontosDoAngulo(ANGULO_GRAUS, width, height);

  const [retVoltar, setRetVoltar] = useState<RetanguloLayout | null>(null);
  const [retCvv, setRetCvv] = useState<RetanguloLayout | null>(null);
  const [retSamu, setRetSamu] = useState<RetanguloLayout | null>(null);
  const [retPorto, setRetPorto] = useState<RetanguloLayout | null>(null);
  const refVoltar = useRef<ElementRef<typeof Pressable>>(null);
  const refCvv = useRef<ElementRef<typeof Pressable>>(null);
  const refSamu = useRef<ElementRef<typeof Pressable>>(null);
  const refPorto = useRef<ElementRef<typeof Pressable>>(null);

  useEffect(() => {
    definirVolumeGeralTrilhaSeAtiva(VOLUME_AJUDA);
    return () => definirVolumeGeralTrilhaSeAtiva(VOLUME_PADRAO);
  }, []);

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(inicio.x, inicio.y)} end={vec(fim.x, fim.y)} colors={DEGRADE_AJUDA} positions={PARADAS} />
        </Rect>
        {retVoltar && <VidroGrupo {...retVoltar} raio={RAIO_BOTAO} cor={CORES.escuro.vidro} corFio={CORES.escuro.fio} />}
        {retCvv && <VidroGrupo {...retCvv} raio={RAIO_CARD} cor={CORES.escuro.vidroForte} corFio={CORES.escuro.fio} />}
        {retSamu && <VidroGrupo {...retSamu} raio={RAIO_CARD} cor={CORES.escuro.vidro} corFio={CORES.escuro.fio} />}
        {retPorto && <VidroGrupo {...retPorto} raio={RAIO_CARD} cor={CORES.escuro.vidro} corFio={CORES.escuro.fio} />}
      </Canvas>

      <Pressable
        ref={refVoltar}
        onPress={() => router.back()}
        hitSlop={16}
        style={styles.botaoVoltar}
        accessibilityLabel={t('comum.voltar')}
        onLayout={() => {
          refVoltar.current?.measureInWindow((x, y, largura, altura) => setRetVoltar({ x, y, largura, altura }));
        }}
      >
        <Text style={styles.textoVoltar}>‹</Text>
      </Pressable>

      <View style={styles.conteudo}>
        <Text style={styles.titulo}>{t('ajuda.titulo1')}</Text>
        <Text style={styles.titulo}>{t('ajuda.titulo2')}</Text>

        <View style={styles.botoes}>
          <Pressable
            ref={refCvv}
            onPress={() => Linking.openURL('tel:188')}
            style={styles.botao}
            onLayout={() => {
              refCvv.current?.measureInWindow((x, y, largura, altura) => setRetCvv({ x, y, largura, altura }));
            }}
          >
            <Text style={styles.botaoTitulo}>{t('ajuda.cvv.rotulo')}</Text>
            <Text style={styles.botaoDescricao}>{t('ajuda.cvv.descricao')}</Text>
          </Pressable>

          <Pressable
            ref={refSamu}
            onPress={() => Linking.openURL('tel:192')}
            style={styles.botao}
            onLayout={() => {
              refSamu.current?.measureInWindow((x, y, largura, altura) => setRetSamu({ x, y, largura, altura }));
            }}
          >
            <Text style={styles.botaoTitulo}>{t('ajuda.samu.rotulo')}</Text>
            <Text style={styles.botaoDescricao}>{t('ajuda.samu.descricao')}</Text>
          </Pressable>

          <Pressable
            ref={refPorto}
            onPress={() => router.push('/porto-seguro')}
            style={styles.botao}
            onLayout={() => {
              refPorto.current?.measureInWindow((x, y, largura, altura) => setRetPorto({ x, y, largura, altura }));
            }}
          >
            <Text style={styles.botaoTitulo}>{t('ajuda.portoSeguro.rotulo')}</Text>
            <Text style={styles.botaoDescricao}>{t('ajuda.portoSeguro.descricao')}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.rodape}>{t('ajuda.rodape')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
  },
  botaoVoltar: {
    position: 'absolute',
    top: 56,
    left: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVoltar: {
    color: CORES.escuro.tinta,
    fontSize: 28,
  },
  conteudo: {
    gap: 24,
  },
  titulo: {
    color: CORES.escuro.tinta,
    textAlign: 'center',
    ...TIPOGRAFIA.tituloTela,
    fontSize: 24,
  },
  botoes: {
    gap: 12,
  },
  botao: {
    minHeight: 76,
    borderRadius: RAIO_CARD,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 4,
  },
  botaoTitulo: {
    color: CORES.escuro.tinta,
    ...TIPOGRAFIA.destaque,
  },
  botaoDescricao: {
    color: CORES.escuro.tintaSecundaria,
    ...TIPOGRAFIA.rotulo,
  },
  rodape: {
    color: CORES.escuro.tintaSecundaria,
    textAlign: 'center',
    ...TIPOGRAFIA.rotulo,
  },
});
