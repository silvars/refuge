import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { useBarraSuperior } from '@/components/useBarraSuperior';
import type { Pesos } from '@/domain/tipos';
import { useRefugioStore } from '@/store';
import { FundoClima } from '@/visual/FundoClima';
import { CORES, TIPOGRAFIA, ehModoClaro } from '@/visual/tokens';

// Tela "Sobre" (ver especificação F10): créditos de conteúdo, versão, nota de privacidade.
// Política de privacidade completa (texto legal nos 4 idiomas) é escopo da Fase 8 (polimento e
// loja) — aqui entra só a nota curta que já aparece em Ajustes, pra não duplicar texto legal
// que ainda não foi escrito/revisado.

export default function Sobre() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const estadoDerivado = useRefugioStore((s) => s.estadoDerivado);
  const misturaAtual = estadoDerivado.misturaAtual ?? { tempestade: 0, nevoa: 100, clareira: 0 };
  const pesosAlvo = useSharedValue<Pesos>({
    tempestade: misturaAtual.tempestade / 100,
    nevoa: misturaAtual.nevoa / 100,
    clareira: misturaAtual.clareira / 100,
  });
  const esmaecidoAlvo = useSharedValue(estadoDerivado.esmaecido);

  const emModoClaro = !estadoDerivado.esmaecido && !!estadoDerivado.misturaAtual && ehModoClaro(estadoDerivado.misturaAtual.clareira / 100);
  const tokens = emModoClaro ? CORES.claro : CORES.escuro;
  const { vidro: barraVidro, barra } = useBarraSuperior({ tokens, aoVoltar: () => router.back() });

  return (
    <View style={styles.container}>
      <FundoClima largura={width} altura={height} pesosAlvo={pesosAlvo} esmaecidoAlvo={esmaecidoAlvo}>
        {barraVidro}
      </FundoClima>
      {barra}

      <View style={styles.conteudo}>
        <Text style={[styles.titulo, { color: tokens.tinta }]}>{t('app.nome')}</Text>
        <Text style={[styles.texto, { color: tokens.tintaSecundaria }]}>
          {t('sobre.versao', { versao: Constants.expoConfig?.version ?? '' })}
        </Text>
        <Text style={[styles.texto, { color: tokens.tintaSecundaria }]}>{t('sobre.creditos')}</Text>
        <Text style={[styles.texto, { color: tokens.tintaSecundaria }]}>{t('sobre.privacidade')}</Text>
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
    gap: 12,
    paddingTop: 112,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  titulo: {
    ...TIPOGRAFIA.tituloTela,
  },
  texto: {
    ...TIPOGRAFIA.corpo,
  },
});
