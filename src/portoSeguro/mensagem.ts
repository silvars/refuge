// Envio da mensagem pro Porto Seguro (ver especificação, seção 11).
//
// Usa o link universal `https://wa.me` direto via `Linking.openURL` — isso evita precisar
// declarar `LSApplicationQueriesSchemes` (iOS) ou `<queries>` (Android), que só são exigidos
// pra `Linking.canOpenURL('whatsapp://...')`. Um link https normal sempre abre (no app do
// WhatsApp se instalado, ou no navegador se não), então o fallback pra SMS só entra se o
// próprio `openURL` falhar.

import { Linking, Platform } from 'react-native';

export type CanalEnvio = 'whatsapp' | 'sms';

export async function abrirMensagem(e164: string, texto: string): Promise<CanalEnvio> {
  const numeroSemMais = e164.replace('+', '');
  const textoCodificado = encodeURIComponent(texto);

  try {
    await Linking.openURL(`https://wa.me/${numeroSemMais}?text=${textoCodificado}`);
    return 'whatsapp';
  } catch {
    const urlSms =
      Platform.OS === 'ios' ? `sms:${e164}&body=${textoCodificado}` : `sms:${e164}?body=${textoCodificado}`;
    await Linking.openURL(urlSms);
    return 'sms';
  }
}
