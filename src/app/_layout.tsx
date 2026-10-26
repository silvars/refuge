import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useFontesCarregadas } from '@/visual/fontes';

SplashScreen.preventAutoHideAsync();

// Layout mínimo do scaffold (issue #6). Providers, barra superior e botão
// Ajuda global entram quando as telas reais forem implementadas.
export default function RootLayout() {
  const fontesCarregadas = useFontesCarregadas();

  useEffect(() => {
    if (fontesCarregadas) SplashScreen.hideAsync();
  }, [fontesCarregadas]);

  if (!fontesCarregadas) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
