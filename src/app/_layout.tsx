import * as LocalAuthentication from 'expo-local-authentication';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { abrirBanco } from '@/data/db';
import { iniciarI18n, obterIdiomaInicial } from '@/i18n';
import { configurarNotificacoes, observarRespostaNotificacao } from '@/notificacoes';
import { useRefugioStore } from '@/store';
import { useFontesCarregadas } from '@/visual/fontes';
import { TelaBloqueio } from '@/components/TelaBloqueio';

SplashScreen.preventAutoHideAsync();

// Layout raiz: providers (fontes, i18n), notificações (deep link de toque) e o bloqueio do app
// (F10) — tranca de novo sempre que o app volta a ficar ativo, ver useEffect de AppState abaixo.
export default function RootLayout() {
  const fontesCarregadas = useFontesCarregadas();
  const [i18nPronto, setI18nPronto] = useState(false);

  const carregado = useRefugioStore((s) => s.carregado);
  const bloqueioLigado = useRefugioStore((s) => s.preferencias.bloqueio);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [autenticando, setAutenticando] = useState(false);
  const autenticandoRef = useRef(false);

  useEffect(() => {
    (async () => {
      const db = await abrirBanco();
      const idioma = await obterIdiomaInicial(db);
      await iniciarI18n(idioma);
      setI18nPronto(true);
    })();
  }, []);

  useEffect(() => {
    if (!carregado) useRefugioStore.getState().carregar();
  }, [carregado]);

  useEffect(() => {
    configurarNotificacoes();
    return observarRespostaNotificacao((rota) => router.push(rota as Parameters<typeof router.push>[0]));
  }, []);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active') setDesbloqueado(false);
    });
    return () => assinatura.remove();
  }, []);

  async function autenticar() {
    if (autenticandoRef.current) return;
    autenticandoRef.current = true;
    setAutenticando(true);
    const resultado = await LocalAuthentication.authenticateAsync({ disableDeviceFallback: false });
    autenticandoRef.current = false;
    setAutenticando(false);
    if (resultado.success) setDesbloqueado(true);
  }

  useEffect(() => {
    if (!(carregado && bloqueioLigado && !desbloqueado)) return;
    const tempo = setTimeout(() => autenticar(), 0);
    return () => clearTimeout(tempo);
  }, [carregado, bloqueioLigado, desbloqueado]);

  const pronto = fontesCarregadas && i18nPronto;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {carregado && bloqueioLigado && !desbloqueado && <TelaBloqueio aoTentar={autenticar} tentando={autenticando} />}
    </>
  );
}
