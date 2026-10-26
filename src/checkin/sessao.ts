import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import type { Pergunta } from '@/conteudo/tipos';
import { shuffleOrders } from '@/domain/clima';
import type { Clima, SessaoCheckin } from '@/domain/tipos';

// Sessão de check-in em andamento (ver 02-sdd.md, seção 4) — só em memória, nunca persiste
// sozinha; `src/app/checkin/resultado.tsx` é quem grava o Checkin final no banco (store.ts).

interface CheckinSessaoState {
  sessao: SessaoCheckin | null;
  perguntas: readonly Pergunta[];
  etiquetas: readonly string[];
  iniciar: (perguntas: readonly Pergunta[], climaAnterior: Clima | null) => void;
  responder: (indicePergunta: number, indiceOpcaoOriginal: number) => void;
  marcarPausaFeita: () => void;
  definirEtiquetas: (ids: readonly string[]) => void;
  limpar: () => void;
}

export const useCheckinSessao = create<CheckinSessaoState>((set, get) => ({
  sessao: null,
  perguntas: [],
  etiquetas: [],

  iniciar(perguntas, climaAnterior) {
    set({
      sessao: {
        id: Crypto.randomUUID(),
        iniciadoEm: Date.now(),
        ordens: shuffleOrders(perguntas),
        respostas: perguntas.map(() => null),
        pausaFeita: false,
        climaAnterior,
      },
      perguntas,
      etiquetas: [],
    });
  },

  responder(indicePergunta, indiceOpcaoOriginal) {
    const { sessao } = get();
    if (!sessao) return;
    const respostas = sessao.respostas.slice();
    respostas[indicePergunta] = indiceOpcaoOriginal;
    set({ sessao: { ...sessao, respostas } });
  },

  marcarPausaFeita() {
    const { sessao } = get();
    if (!sessao) return;
    set({ sessao: { ...sessao, pausaFeita: true } });
  },

  definirEtiquetas(ids) {
    set({ etiquetas: ids });
  },

  limpar() {
    set({ sessao: null, perguntas: [], etiquetas: [] });
  },
}));
