import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Layout mínimo do scaffold (issue #6). Fontes, providers, barra superior e
// botão Ajuda global entram quando as telas reais forem implementadas.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
