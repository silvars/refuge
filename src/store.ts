import i18next from 'i18next';
import { create } from 'zustand';

import type { LinhaConteudo } from '@/conteudo/tipos';
import type { Checkin, EstadoDerivado, Preferencias } from '@/domain/tipos';
import type { Idioma } from '@/i18n/idioma';

import { aplicarPreferenciaSom } from './audio/trilha';
import { abrirBanco, apagarTudo as apagarBanco } from './data/db';
import { diaLocal } from './data/dominio';
import { estadoDerivado, inserirCheckin, lerPreferencia, registrarEventoDia, salvarPreferencia } from './data/repositorios';
import { cancelarLembrete, cancelarMensagemApoio, cancelarTudo, reagendarLembrete, reagendarMensagemApoio } from './notificacoes';

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

function linhasAtivasDe(preferencias: Preferencias): LinhaConteudo[] {
  return (['neutra', 'espiritual', 'filosofica'] as const).filter((l) => preferencias.linhas[l]);
}

interface RefugioStore {
  carregado: boolean;
  preferencias: Preferencias;
  estadoDerivado: EstadoDerivado;
  carregar: () => Promise<void>;
  atualizarPreferencias: (parcial: Partial<Preferencias>) => Promise<void>;
  registrarCheckin: (checkin: Checkin) => Promise<void>;
  /** Marca o dia como "compartilhou com um Porto Seguro" e zera a sequência (especificação F8, item 9). */
  registrarCompartilhamentoPortoSeguro: () => Promise<void>;
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
    aplicarPreferenciaSom(preferencias.som);
    // Reagenda ao abrir o app (o sistema pode descartar agendamentos — 02-sdd.md, seção 10, regra 4).
    reagendarMensagemApoio(db, {
      clima: derivado.climaAtual,
      linhasAtivas: linhasAtivasDe(preferencias),
      idioma: i18next.language as Idioma,
      mensagensApoioLigadas: preferencias.mensagensApoio,
      silencio: preferencias.silencio,
    }).catch(() => {});
  },

  async atualizarPreferencias(parcial) {
    const preferencias = { ...get().preferencias, ...parcial };
    const db = await abrirBanco();
    await salvarPreferencia(db, CHAVE_PREFERENCIAS, JSON.stringify(preferencias));
    set({ preferencias });

    if (parcial.som !== undefined) aplicarPreferenciaSom(parcial.som);
    if (parcial.lembretes === false) cancelarLembrete().catch(() => {});
    if (parcial.mensagensApoio === false) cancelarMensagemApoio().catch(() => {});
    if (parcial.mensagensApoio === true) {
      const derivado = get().estadoDerivado;
      reagendarMensagemApoio(db, {
        clima: derivado.climaAtual,
        linhasAtivas: linhasAtivasDe(preferencias),
        idioma: i18next.language as Idioma,
        mensagensApoioLigadas: true,
        silencio: preferencias.silencio,
      }).catch(() => {});
    }
  },

  async registrarCheckin(checkin) {
    const db = await abrirBanco();
    await inserirCheckin(db, checkin);
    const derivado = await estadoDerivado(db, Date.now());
    set({ estadoDerivado: derivado });

    const preferencias = get().preferencias;
    reagendarLembrete(checkin, preferencias.lembretes, preferencias.silencio).catch(() => {});
    reagendarMensagemApoio(db, {
      clima: checkin.clima,
      linhasAtivas: linhasAtivasDe(preferencias),
      idioma: i18next.language as Idioma,
      mensagensApoioLigadas: preferencias.mensagensApoio,
      silencio: preferencias.silencio,
    }).catch(() => {});
  },

  async registrarCompartilhamentoPortoSeguro() {
    const db = await abrirBanco();
    const agora = Date.now();
    await registrarEventoDia(db, diaLocal(agora), 'porto_seguro', agora);
    const derivado = await estadoDerivado(db, agora);
    set({ estadoDerivado: derivado });
  },

  async apagarTudo() {
    await cancelarTudo().catch(() => {});
    await apagarBanco();
    set({ preferencias: PREFERENCIAS_PADRAO, estadoDerivado: ESTADO_DERIVADO_INICIAL, carregado: false });
  },
}));
