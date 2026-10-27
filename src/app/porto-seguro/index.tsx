'use no memo';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ElementRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { definirMisturaTrilha } from '@/audio/trilha';
import { useBarraSuperior } from '@/components/useBarraSuperior';
import { getEstados, getPortoSeguro } from '@/conteudo';
import type { ConteudoPortoSeguro } from '@/conteudo/tipos';
import type { Clima, Pesos } from '@/domain/tipos';
import { hapticEscolha } from '@/haptics';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';
import { escolherContato } from '@/portoSeguro/contato';
import { abrirMensagem } from '@/portoSeguro/mensagem';
import { aplicarNomeNaMensagem, mensagensDoClima, proximaMensagem } from '@/portoSeguro/selecaoMensagem';
import { useRefugioStore } from '@/store';
import { FundoClima } from '@/visual/FundoClima';
import { VidroGrupo } from '@/visual/Vidro';
import { CORES, RAIO_BOTAO, RAIO_CARD, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Tela "Compartilhar com um Porto Seguro" (ver especificação F8). A mensagem nasce do clima
// atual e é editável; ao escolher o contato, se o texto não foi mexido, "Oi!" vira "Oi, <nome>!".
// Ao voltar do WhatsApp/SMS (app volta a ficar ativo), navega pra tela de acolhimento.

const CLIMA_PADRAO: Clima = 'nevoa';

interface RetanguloLayout {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export default function PortoSeguro() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language as Idioma;
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);
  const registrarCompartilhamento = useRefugioStore((s) => s.registrarCompartilhamentoPortoSeguro);
  const clima = estadoDerivado.climaAtual ?? CLIMA_PADRAO;
  const misturaAtual = estadoDerivado.misturaAtual ?? { tempestade: 0, nevoa: 100, clareira: 0 };

  const pesosAlvo = useSharedValue<Pesos>({
    tempestade: misturaAtual.tempestade / 100,
    nevoa: misturaAtual.nevoa / 100,
    clareira: misturaAtual.clareira / 100,
  });
  const esmaecidoAlvo = useSharedValue(false);

  const [conteudo, setConteudo] = useState<ConteudoPortoSeguro | null>(null);
  const [nomeClima, setNomeClima] = useState('');
  const [indiceMensagem, setIndiceMensagem] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [retCard, setRetCard] = useState<RetanguloLayout | null>(null);
  const [retEscolher, setRetEscolher] = useState<RetanguloLayout | null>(null);
  const refCard = useRef<ElementRef<typeof View>>(null);
  const refEscolher = useRef<ElementRef<typeof Pressable>>(null);
  const textoBaseRef = useRef('');
  const aguardandoRetornoRef = useRef(false);
  const nomeContatoRef = useRef('');

  useEffect(() => {
    definirMisturaTrilha(pesosAlvo.value);
    Promise.all([getPortoSeguro(), getEstados()]).then(([conteudoPorto, estados]) => {
      setConteudo(conteudoPorto);
      setNomeClima(textoLocalizado(estados.estados[clima].nome, idioma));
      const mensagens = mensagensDoClima(conteudoPorto, clima);
      const texto = textoLocalizado(mensagens[0], idioma);
      setMensagem(texto);
      textoBaseRef.current = texto;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clima, idioma]);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (proximoEstado) => {
      if (proximoEstado === 'active' && aguardandoRetornoRef.current) {
        aguardandoRetornoRef.current = false;
        registrarCompartilhamento().catch(() => {});
        router.replace({ pathname: '/porto-seguro/acolhimento', params: { nome: nomeContatoRef.current } });
      }
    });
    return () => assinatura.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sugerirOutra() {
    if (!conteudo) return;
    hapticEscolha().catch(() => {});
    const mensagens = mensagensDoClima(conteudo, clima);
    const { mensagem: proxima, indice } = proximaMensagem(mensagens, indiceMensagem);
    const texto = textoLocalizado(proxima, idioma);
    setIndiceMensagem(indice);
    setMensagem(texto);
    textoBaseRef.current = texto;
  }

  async function aoEscolherContato() {
    const contato = await escolherContato().catch(() => null);
    if (!contato) return;
    if (!contato.e164) {
      Alert.alert(t('portoSeguro.semNumeroValido'));
      return;
    }

    const editado = mensagem !== textoBaseRef.current;
    const textoFinal = editado ? mensagem : aplicarNomeNaMensagem(mensagem, contato.primeiroNome);

    setEnviando(true);
    try {
      nomeContatoRef.current = contato.primeiroNome;
      aguardandoRetornoRef.current = true;
      await abrirMensagem(contato.e164, textoFinal);
    } finally {
      setEnviando(false);
    }
  }

  const modoClaro = !estadoDerivado.esmaecido && ehModoClaro(misturaAtual.clareira / 100);
  const tokens = modoClaro ? CORES.claro : CORES.escuro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens, aoVoltar: () => router.back() });

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {barraVidro}
        {retCard && <VidroGrupo {...retCard} raio={RAIO_CARD} cor={tokens.vidro} corFio={tokens.fio} />}
        {retEscolher && <VidroGrupo {...retEscolher} raio={RAIO_BOTAO} cor={tokens.vidroForte} corFio={tokens.fio} />}
      </FundoClima>
      {barra}

      <View style={styles.conteudo}>
        <Text style={[styles.titulo, { color: tokens.tinta }]}>{t('portoSeguro.titulo')}</Text>
        <Text style={[styles.subtitulo, { color: tokens.tintaSecundaria }]}>{t('portoSeguro.subtitulo')}</Text>

        <View
          ref={refCard}
          style={styles.card}
          onLayout={() => {
            refCard.current?.measureInWindow((x, y, largura, altura) => setRetCard({ x, y, largura, altura }));
          }}
        >
          <Text style={[styles.faixaClima, { color: tokens.tintaSecundaria }]}>
            {t('portoSeguro.seuClimaAgora', { clima: nomeClima })}
          </Text>
          <TextInput
            value={mensagem}
            onChangeText={setMensagem}
            multiline
            style={[styles.caixaTexto, { color: tokens.tinta }]}
            placeholderTextColor={tokens.tintaSecundaria}
          />
          <Pressable onPress={sugerirOutra} hitSlop={8}>
            <Text style={[styles.sugerirOutra, { color: tokens.tinta }]}>{t('portoSeguro.sugerirOutra')}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        ref={refEscolher}
        onPress={aoEscolherContato}
        disabled={enviando}
        style={styles.botaoEscolher}
        onLayout={() => {
          refEscolher.current?.measureInWindow((x, y, largura, altura) => setRetEscolher({ x, y, largura, altura }));
        }}
      >
        {enviando ? (
          <ActivityIndicator color={tokens.tinta} />
        ) : (
          <Text style={[styles.botaoTexto, { color: tokens.tinta }]}>{t('portoSeguro.escolherContato')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 140,
    paddingBottom: 48,
    paddingHorizontal: 24,
    gap: 24,
  },
  conteudo: {
    gap: 16,
  },
  titulo: {
    ...TIPOGRAFIA.tituloTela,
    fontSize: 26,
  },
  subtitulo: {
    ...TIPOGRAFIA.corpo,
  },
  card: {
    borderRadius: RAIO_CARD,
    padding: 20,
    gap: 12,
    marginTop: 8,
  },
  faixaClima: {
    ...TIPOGRAFIA.rotulo,
  },
  caixaTexto: {
    ...TIPOGRAFIA.corpo,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  sugerirOutra: {
    ...TIPOGRAFIA.destaque,
    fontSize: 15,
  },
  botaoEscolher: {
    height: 52,
    borderRadius: RAIO_BOTAO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    ...TIPOGRAFIA.destaque,
  },
});
