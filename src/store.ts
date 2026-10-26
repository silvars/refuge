import { create } from 'zustand';

import type { Checkin, EstadoDerivado, Preferencias } from '@/domain/tipos';

import { abrirBanco, apagarTudo as apagarBanco } from './data/db';
import { estadoDerivado, inserirCheckin, lerPreferencia, salvarPreferencia } from './data/repositorios';

// Estado global de sessão e preferências (ver 02-sdd.md, seção 3/4). Carrega do banco
// criptografado ao iniciar; as ações já persistem antes de atualizar o estado em memória.

/** Neutra ligada por padrão; espiritual/filosófica a pessoa escolhe (ver especificação, seção 10). */
export const PREFERENCIAS_PADRAO: Preferencias = {
  linhas: { neutra: true, espiritual: false, filosofica: false },
  som: true,
  vibracao: true,
  lembretes: true,
  mensagensApoio: false,
  bloqueio: false,
  silencio: { inicio: '22:00', fim: '08:00' },
  onboardingFeito: false,
};

const ESTADO_DERIVADO_INICIAL: EstadoDerivado = {
  climaAtual: null,
  misturaAtual: null,
  sequencia: 0,
  ultimoCheckinEm: null,
  esmaecido: false,
};

const CHAVE_PREFERENCIAS = 'preferencias';

interface RefugioStore {
  carregado: boolean;
  preferencias: Preferencias;
  estadoDerivado: EstadoDerivado;
  carregar: () => Promise<void>;
  atualizarPreferencias: (parcial: Partial<Preferencias>) => Promise<void>;
  registrarCheckin: (checkin: Checkin) => Promise<void>;
  apagarTudo: () => Promise<void>;
}

export const useRefugioStore = create<RefugioStore>((set, get) => ({
  carregado: false,
  preferencias: PREFERENCIAS_PADRAO,
  estadoDerivado: ESTADO_DERIVADO_INICIAL,

  async carregar() {
    const db = await abrirBanco();
    const salvas = await lerPreferencia(db, CHAVE_PREFERENCIAS);
    const preferencias: Preferencias = salvas ? { ...PREFERENCIAS_PADRAO, ...JSON.parse(salvas) } : PREFERENCIAS_PADRAO;
    const derivado = await estadoDerivado(db, Date.now());
    set({ preferencias, estadoDerivado: derivado, carregado: true });
  },

  async atualizarPreferencias(parcial) {
    const preferencias = { ...get().preferencias, ...parcial };
    const db = await abrirBanco();
    await salvarPreferencia(db, CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
    set({ preferencias });
  },

  async registrarCheckin(checkin) {
    const db = await abrirBanco();
    await inserirCheckin(db, checkin);
    const derivado = await estadoDerivado(db, Date.now());
    set({ estadoDerivado: derivado });
  },

  async apagarTudo() {
    await apagarBanco();
    set({ preferencias: PREFERENCIAS_PADRAO, estadoDerivado: ESTADO_DERIVADO_INICIAL, carregado: false });
  },
}));
