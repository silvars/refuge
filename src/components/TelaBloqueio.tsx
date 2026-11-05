import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Bloquear o app (F10): tela cheia fixa (não depende de banco/conteúdo), cobre tudo até a
// biometria ou PIN do aparelho confirmar — ver src/app/_layout.tsx pro ciclo de vida (tranca de
// novo sempre que o app volta a ficar ativo).

export interface TelaBloqueioProps {
  aoTentar: () => void;
  tentando: boolean;
}

export function TelaBloqueio({ aoTentar, tentando }: TelaBloqueioProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{t('bloqueio.titulo')}</Text>
      <Text style={styles.subtitulo}>{t('bloqueio.subtitulo')}</Text>
      <Pressable onPress={aoTentar} disabled={tentando} style={styles.botao}>
        <Text style={styles.botaoTexto}>{t('bloqueio.botao')}</Text>
      </Pressable>
    </View>
  );
}

/** Hardware de biometria disponível e com pelo menos uma credencial cadastrada. */
export async function biometriaDisponivel(): Promise<boolean> {
  const [temHardware, estaCadastrada] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return temHardware && estaCadastrada;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#101418',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  titulo: {
    color: '#FCFCFC',
    fontSize: 20,
    textAlign: 'center',
  },
  subtitulo: {
    color: 'rgba(252,252,252,0.86)',
    fontSize: 15,
    textAlign: 'center',
  },
  botao: {
    marginTop: 16,
    height: 52,
    paddingHorizontal: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(252,252,252,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: {
    color: '#FCFCFC',
    fontSize: 16,
    fontWeight: '500',
  },
});
