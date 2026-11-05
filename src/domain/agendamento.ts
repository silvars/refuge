// Regras de agendamento de notificações locais (ver especificação F11/F12; 02-sdd.md, seção
// 10) — função pura, sem expo-notifications aqui (ver src/notificacoes.ts pros efeitos).

export interface JanelaSilencio {
  readonly inicio: string; // 'HH:MM'
  readonly fim: string;
}

const MS_MINUTO = 60_000;
const MS_HORA = 60 * MS_MINUTO;
const TETO_NOTIFICACOES_POR_DIA = 2;

function minutosDoDia(data: Date): number {
  return data.getHours() * 60 + data.getMinutes();
}

function minutosDoHorario(horario: string): number {
  const [h, m] = horario.split(':').map(Number);
  return h * 60 + m;
}

/** Horário (local) cai dentro do silêncio — pode cruzar a meia-noite (ex. 22:00–08:00). */
export function dentroDoSilencio(momentoMs: number, silencio: JanelaSilencio): boolean {
  const minutos = minutosDoDia(new Date(momentoMs));
  const inicio = minutosDoHorario(silencio.inicio);
  const fim = minutosDoHorario(silencio.fim);
  if (inicio === fim) return false; // janela degenerada ("00:00"–"00:00") = sem silêncio
  if (inicio < fim) return minutos >= inicio && minutos < fim;
  return minutos >= inicio || minutos < fim; // cruza a meia-noite
}

/** Empurra um horário que cai no silêncio pro fim da janela (mesmo dia, ou o seguinte se já passou). */
export function ajustarForaDoSilencio(momentoMs: number, silencio: JanelaSilencio): number {
  if (!dentroDoSilencio(momentoMs, silencio)) return momentoMs;
  const fimMinutos = minutosDoHorario(silencio.fim);
  const ajustado = new Date(momentoMs);
  ajustado.setHours(Math.floor(fimMinutos / 60), fimMinutos % 60, 0, 0);
  if (ajustado.getTime() <= momentoMs) ajustado.setDate(ajustado.getDate() + 1);
  return ajustado.getTime();
}

/** Horário do lembrete de recalibração (F11): sorteado entre +4h e +12h após o check-in, fora do silêncio. */
export function calcularLembrete(checkinEm: number, silencio: JanelaSilencio, aleatorio: () => number = Math.random): number {
  const atrasoMs = (4 + aleatorio() * 8) * MS_HORA;
  return ajustarForaDoSilencio(checkinEm + atrasoMs, silencio);
}

/** Teto global de 2 notificações por dia (lembrete + apoio somados) — seção 10, regra 3. */
export function podeAgendarMais(notificacoesHoje: number): boolean {
  return notificacoesHoje < TETO_NOTIFICACOES_POR_DIA;
}

const JANELA_MANHA = { inicioH: 9, fimH: 11 };
const JANELA_TARDE = { inicioH: 17, fimH: 19 };

/** Horário sorteado pra mensagem de apoio (F12): manhã 9–11h ou fim de tarde 17–19h, fora do silêncio. */
export function calcularHorarioApoio(
  dataBase: Date,
  momento: 'manha' | 'noite',
  silencio: JanelaSilencio,
  aleatorio: () => number = Math.random,
): number {
  const janela = momento === 'manha' ? JANELA_MANHA : JANELA_TARDE;
  const minutosNaJanela = (janela.inicioH + aleatorio() * (janela.fimH - janela.inicioH)) * 60;
  const horario = new Date(dataBase);
  horario.setHours(Math.floor(minutosNaJanela / 60), Math.round(minutosNaJanela % 60), 0, 0);
  return ajustarForaDoSilencio(horario.getTime(), silencio);
}
