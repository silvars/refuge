import { useRouter } from 'expo-router';
import { useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TokensDeCor } from '@/visual/tokens';
import { RAIO_BOTAO, TIPOGRAFIA, COR_AJUDA } from '@/visual/tokens';
import { VidroGrupo } from '@/visual/Vidro';

// Barra superior (ver especificação, seção 5 e 9.1): voltar à esquerda, Ajuda à direita, em
// praticamente todas as telas do app. Botão Ajuda sempre presente e sempre funcional (protocolo
// de segurança — requisito de lançamento), mesmo offline. `vidro` entra como filho do Canvas da
// tela (FundoClima); `barra` entra em fluxo normal, por cima.

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface OpcoesBarraSuperior {
  tokens: TokensDeCor;
  /** Se ausente, não mostra o botão de voltar. */
  aoVoltar?: () => void;
  /** Botão Ajustes, só na tela principal (ver especificação, seção 5). */
  comAjustes?: boolean;
}

export function useBarraSuperior({ tokens, aoVoltar, comAjustes = false }: OpcoesBarraSuperior) {
  const { t } = useTranslation();
  const router = useRouter();
  const [retVoltar, setRetVoltar] = useState<RetanguloLayout | null>(null);
  const [retAjustes, setRetAjustes] = useState<RetanguloLayout | null>(null);
  const [retAjuda, setRetAjuda] = useState<RetanguloLayout | null>(null);
  const refVoltar = useRef<ElementRef<typeof Pressable>>(null);
  const refAjustes = useRef<ElementRef<typeof Pressable>>(null);
  const refAjuda = useRef<ElementRef<typeof Pressable>>(null);

  const vidro = (
    <>
      {retVoltar && <VidroGrupo {...retVoltar} raio={RAIO_BOTAO} cor={tokens.vidro} corFio={tokens.fio} />}
      {retAjustes && <VidroGrupo {...retAjustes} raio={RAIO_BOTAO} cor={tokens.vidro} corFio={tokens.fio} />}
      {retAjuda && <VidroGrupo {...retAjuda} raio={RAIO_BOTAO} cor={tokens.vidroForte} corFio={tokens.fio} />}
    </>
  );

  const barra = (
    <View style={styles.barra} pointerEvents="box-none">
      {aoVoltar ? (
        <Pressable
          ref={refVoltar}
          onPress={aoVoltar}
          hitSlop={16}
          style={styles.botaoVoltar}
          accessibilityLabel={t('comum.voltar')}
          onLayout={() => {
            refVoltar.current?.measureInWindow((x, y, largura, altura) => setRetVoltar({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.textoVoltar, { color: tokens.tinta }]}>‹</Text>
        </Pressable>
      ) : (
        <View />
      )}
      <View style={styles.grupoDireita}>
        {comAjustes && (
          <Pressable
            ref={refAjustes}
            onPress={() => router.push('/ajustes')}
            style={styles.botaoAjustes}
            accessibilityLabel={t('ajustes.titulo')}
            onLayout={() => {
              refAjustes.current?.measureInWindow((x, y, largura, altura) => setRetAjustes({ x, y, largura, altura }));
            }}
          >
            <Text style={[styles.textoAjustes, { color: tokens.tinta }]}>⚙︎</Text>
          </Pressable>
        )}
        <Pressable
          ref={refAjuda}
          onPress={() => router.push('/ajuda')}
          style={styles.botaoAjuda}
          onLayout={() => {
            refAjuda.current?.measureInWindow((x, y, largura, altura) => setRetAjuda({ x, y, largura, altura }));
          }}
        >
          <View style={styles.pontoAjuda} />
          <Text style={[styles.textoAjuda, { color: tokens.tinta }]}>{t('ajuda.botao')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return { vidro, barra };
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    top: 56,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botaoVoltar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVoltar: {
    fontSize: 28,
  },
  grupoDireita: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoAjustes: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAjustes: {
    fontSize: 20,
  },
  botaoAjuda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 18,
  },
  pontoAjuda: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COR_AJUDA,
  },
  textoAjuda: {
    ...TIPOGRAFIA.destaque,
  },
});
