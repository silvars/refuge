import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

// Layout mínimo do scaffold (issue #6). Fontes, providers, barra superior e
// botão Ajuda global entram quando as telas reais forem implementadas.
export default function RootLayout() {
  useEffect(() => {
    // Nada para esperar ainda (sem fontes customizadas até a issue #7) — esconde direto.
    SplashScreen.hideAsync();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
