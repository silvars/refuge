import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { abrirBanco } from '@/data/db';
import { iniciarI18n, obterIdiomaInicial } from '@/i18n';
import { useFontesCarregadas } from '@/visual/fontes';

SplashScreen.preventAutoHideAsync();

// Layout mínimo do scaffold (issue #6). Providers, barra superior e botão
// Ajuda global entram quando as telas reais forem implementadas.
export default function RootLayout() {
  const fontesCarregadas = useFontesCarregadas();
  const [i18nPronto, setI18nPronto] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await abrirBanco();
      const idioma = await obterIdiomaInicial(db);
      await iniciarI18n(idioma);
      setI18nPronto(true);
    })();
  }, []);

  const pronto = fontesCarregadas && i18nPronto;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
