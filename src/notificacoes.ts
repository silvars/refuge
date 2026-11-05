import type { DB } from '@op-engineering/op-sqlite';
import * as Notifications from 'expo-notifications';
import i18next from 'i18next';

import { getFrases } from '@/conteudo';
import { frasesElegiveis, escolherFrase } from '@/conteudo/selecaoFrases';
import type { LinhaConteudo } from '@/conteudo/tipos';
import { calcularHorarioApoio, calcularLembrete, podeAgendarMais, type JanelaSilencio } from '@/domain/agendamento';
import type { Checkin, Clima } from '@/domain/tipos';
import { diaLocal } from '@/data/dominio';
import { foiFraseExibidaRecentemente, registrarFraseExibida } from '@/data/repositorios';
import type { Idioma } from '@/i18n/idioma';
import { textoLocalizado } from '@/i18n/textoLocalizado';

// Efeitos sobre expo-notifications (ver especificação F11/F12; 02-sdd.md, seção 10) — regras
// puras ficam em domain/agendamento.ts (testado). Sem teste automatizado aqui, mesmo motivo de
// db.ts/repositorios.ts (módulo nativo, não roda sob Jest).

const CANAL_PADRAO = 'lembretes';
const NAO_REPETIR_DIAS_PADRAO = 14;

type DadosNotificacao = { tipo: 'lembrete' | 'apoio'; dia: string; rota: string };

async function garantirCanalAndroid(): Promise<void> {
  // AndroidImportance existe (ver node_modules/expo-notifications/build/
  // NotificationChannelManager.types.d.ts); o resolver do import/namespace só não segue o re-export em barrel.
  await Notifications.setNotificationChannelAsync(CANAL_PADRAO, {
    name: 'Lembretes e mensagens de apoio',
    // eslint-disable-next-line import/namespace -- falso positivo, ver comentário acima
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Só pede permissão quando a pessoa ativa lembretes ou mensagens (nunca no onboarding). */
export async function pedirPermissaoSeNecessario(): Promise<boolean> {
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  return pedido.granted;
}

async function cancelarPorTipo(tipo: DadosNotificacao['tipo']): Promise<void> {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendadas
      .filter((n) => (n.content.data as Partial<DadosNotificacao> | undefined)?.tipo === tipo)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

async function contarNotificacoesDoDia(dia: string): Promise<number> {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  return agendadas.filter((n) => (n.content.data as Partial<DadosNotificacao> | undefined)?.dia === dia).length;
}

export async function cancelarLembrete(): Promise<void> {
  await cancelarPorTipo('lembrete');
}

export async function cancelarMensagemApoio(): Promise<void> {
  await cancelarPorTipo('apoio');
}

export async function cancelarTudo(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** F11: após check-in em Tempestade/Névoa, agenda 1 lembrete entre +4h e +12h (cancela o anterior). */
export async function reagendarLembrete(checkin: Checkin, lembretesLigados: boolean, silencio: JanelaSilencio): Promise<void> {
  await cancelarPorTipo('lembrete');
  if (!lembretesLigados || checkin.clima === 'clareira') return;

  const concedido = await pedirPermissaoSeNecessario();
  if (!concedido) return;
  await garantirCanalAndroid();

  const horario = calcularLembrete(checkin.em, silencio);
  const dia = diaLocal(horario);
  if (!podeAgendarMais(await contarNotificacoesDoDia(dia))) return;

  const dados: DadosNotificacao = { tipo: 'lembrete', dia, rota: '/vamos-comecar' };
  await Notifications.scheduleNotificationAsync({
    // eslint-disable-next-line import/no-named-as-default-member -- uso padrão do i18next: .t() na própria instância
    content: { body: i18next.t('notificacoes.lembrete'), data: dados },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(horario), channelId: CANAL_PADRAO },
  });
}

export interface ParametrosMensagemApoio {
  readonly clima: Clima | null;
  readonly linhasAtivas: readonly LinhaConteudo[];
  readonly idioma: Idioma;
  readonly mensagensApoioLigadas: boolean;
  readonly silencio: JanelaSilencio;
}

/** F12: no máximo 1 mensagem de apoio por dia, pelo último clima, sem repetir `nao_repetir_dias`. */
export async function reagendarMensagemApoio(db: DB, params: ParametrosMensagemApoio): Promise<void> {
  if (!params.mensagensApoioLigadas || !params.clima) return;

  const hoje = diaLocal(Date.now());
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  const jaTemHoje = agendadas.some((n) => {
    const dados = n.content.data as Partial<DadosNotificacao> | undefined;
    return dados?.tipo === 'apoio' && dados.dia === hoje;
  });
  if (jaTemHoje) return;

  const momento: 'manha' | 'noite' = Math.random() < 0.5 ? 'manha' : 'noite';
  const horario = calcularHorarioApoio(new Date(), momento, params.silencio);
  if (horario < Date.now()) return; // janela de hoje já passou — tenta de novo no próximo carregamento

  const dia = diaLocal(horario);
  if (!podeAgendarMais(await contarNotificacoesDoDia(dia))) return;

  const conteudo = await getFrases();
  const elegiveis = frasesElegiveis(conteudo.frases, {
    clima: params.clima,
    uso: 'notificacao',
    linhasAtivas: params.linhasAtivas,
    idioma: params.idioma,
    momento,
  });
  const naoRepetidas = (
    await Promise.all(
      elegiveis.map(async (f) => ({
        f,
        recente: await foiFraseExibidaRecentemente(db, f.id, f.nao_repetir_dias ?? NAO_REPETIR_DIAS_PADRAO, Date.now()),
      })),
    )
  )
    .filter((x) => !x.recente)
    .map((x) => x.f);
  const escolhida = escolherFrase(naoRepetidas.length > 0 ? naoRepetidas : elegiveis);
  if (!escolhida) return;

  const concedido = await pedirPermissaoSeNecessario();
  if (!concedido) return;
  await garantirCanalAndroid();

  const dados: DadosNotificacao = { tipo: 'apoio', dia, rota: '/' };
  await Notifications.scheduleNotificationAsync({
    content: { body: textoLocalizado(escolhida.texto, params.idioma), data: dados },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(horario), channelId: CANAL_PADRAO },
  });
  await registrarFraseExibida(db, escolhida.id, Date.now());
}

/** Chamar uma vez no boot do app (ver src/app/_layout.tsx). */
export function configurarNotificacoes(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Deep link ao tocar numa notificação (toque que abriu o app a frio ou com o app já aberto). */
export function observarRespostaNotificacao(aoAbrir: (rota: string) => void): () => void {
  function redirecionar(notificacao: Notifications.Notification | undefined | null) {
    const rota = (notificacao?.request.content.data as Partial<DadosNotificacao> | undefined)?.rota;
    if (typeof rota === 'string') aoAbrir(rota);
  }

  Notifications.getLastNotificationResponseAsync().then((resposta) => {
    if (!resposta) return;
    redirecionar(resposta.notification);
    Notifications.clearLastNotificationResponseAsync();
  });

  const assinatura = Notifications.addNotificationResponseReceivedListener((resposta) => {
    redirecionar(resposta.notification);
  });
  return () => assinatura.remove();
}
