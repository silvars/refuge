import { Urbanist_300Light, Urbanist_500Medium } from '@expo-google-fonts/urbanist';
import { Roboto_400Regular } from '@expo-google-fonts/roboto';
import { useFonts } from 'expo-font';

/** Carrega as fontes usadas pelos tokens de tipografia (ver src/visual/tokens.ts). */
export function useFontesCarregadas(): boolean {
  const [carregadas] = useFonts({
    Urbanist_300Light,
    Urbanist_500Medium,
    Roboto_400Regular,
  });
  return carregadas;
}
