import type { DB } from '@op-engineering/op-sqlite';

import { isStale } from '@/domain/clima';
import type { Checkin, Clima, EstadoDerivado, ResumoDia } from '@/domain/tipos';

import { calcularSequencia, diaLocal, resumoDoDia } from './dominio';

// Repositórios do banco criptografado (ver 02-sdd.md, seção 5). Sem teste automatizado — ver
// nota no topo de dominio.ts.

interface LinhaCheckin {
  id: string;
  em: number;
  clima: Clima;
  mix_tempestade: number;
  mix_nevoa: number;
  mix_clareira: number;
  etiquetas: string;
}

async function respostasDoCheckin(db: DB, checkinId: string): Promise<Checkin['respostas']> {
  const r = await db.execute(`SELECT pergunta_id, opcao_id FROM resposta WHERE checkin_id = ?`, [checkinId]);
  return r.rows.map((row) => ({ perguntaId: String(row.pergunta_id), opcaoId: String(row.opcao_id) }));
}

async function linhaParaCheckin(db: DB, l: LinhaCheckin): Promise<Checkin> {
  return {
    id: l.id,
    em: l.em,
    clima: l.clima,
    mistura: { tempestade: l.mix_tempestade, nevoa: l.mix_nevoa, clareira: l.mix_clareira },
    respostas: await respostasDoCheckin(db, l.id),
    etiquetas: JSON.parse(l.etiquetas) as string[],
  };
}

/** Grava o check-in e suas respostas numa transação (ver 02-sdd.md, tabelas `checkin`/`resposta`). */
export async function inserirCheckin(db: DB, checkin: Checkin): Promise<void> {
  const dia = diaLocal(checkin.em);
  await db.transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO checkin (id, em, dia, clima, mix_tempestade, mix_nevoa, mix_clareira, etiquetas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checkin.id,
        checkin.em,
        dia,
        checkin.clima,
        checkin.mistura.tempestade,
        checkin.mistura.nevoa,
        checkin.mistura.clareira,
        JSON.stringify(checkin.etiquetas),
      ],
    );
    for (const r of checkin.respostas) {
      await tx.execute(`INSERT INTO resposta (checkin_id, pergunta_id, opcao_id) VALUES (?, ?, ?)`, [
        checkin.id,
        r.perguntaId,
        r.opcaoId,
      ]);
    }
  });
}

export async function listarCheckinsDoDia(db: DB, dia: string): Promise<Checkin[]> {
  const r = await db.execute(`SELECT * FROM checkin WHERE dia = ? ORDER BY em ASC`, [dia]);
  const linhas = r.rows as unknown as LinhaCheckin[];
  return Promise.all(linhas.map((l) => linhaParaCheckin(db, l)));
}

/** Climas do mais recente pro mais antigo — ver dominio.calcularSequencia. */
export async function climasRecentes(db: DB, limite: number): Promise<Clima[]> {
  const r = await db.execute(`SELECT clima FROM checkin ORDER BY em DESC LIMIT ?`, [limite]);
  return r.rows.map((row) => row.clima as Clima);
}

export async function ultimoCheckin(db: DB): Promise<Checkin | null> {
  const r = await db.execute(`SELECT * FROM checkin ORDER BY em DESC LIMIT 1`);
  const linha = r.rows[0] as unknown as LinhaCheckin | undefined;
  return linha ? linhaParaCheckin(db, linha) : null;
}

export async function registrarEventoDia(db: DB, dia: string, tipo: 'porto_seguro', em: number): Promise<void> {
  await db.execute(`INSERT INTO evento_dia (dia, tipo, em) VALUES (?, ?, ?)`, [dia, tipo, em]);
}

export async function houvePortoSeguroNoDia(db: DB, dia: string): Promise<boolean> {
  const r = await db.execute(`SELECT 1 FROM evento_dia WHERE dia = ? AND tipo = 'porto_seguro' LIMIT 1`, [dia]);
  return r.rows.length > 0;
}

export async function registrarFraseExibida(db: DB, fraseId: string, em: number): Promise<void> {
  await db.execute(`INSERT INTO frase_exibida (frase_id, em) VALUES (?, ?)`, [fraseId, em]);
}

/** Respeita `nao_repetir_dias` da frase (ver especificação, seção F12). */
export async function foiFraseExibidaRecentemente(
  db: DB,
  fraseId: string,
  naoRepetirDias: number,
  agora: number,
): Promise<boolean> {
  const limite = agora - naoRepetirDias * 24 * 3600 * 1000;
  const r = await db.execute(`SELECT 1 FROM frase_exibida WHERE frase_id = ? AND em > ? LIMIT 1`, [fraseId, limite]);
  return r.rows.length > 0;
}

export async function lerPreferencia(db: DB, chave: string): Promise<string | null> {
  const r = await db.execute(`SELECT valor FROM preferencia WHERE chave = ?`, [chave]);
  return r.rows[0] ? String(r.rows[0].valor) : null;
}

export async function salvarPreferencia(db: DB, chave: string, valor: string): Promise<void> {
  await db.execute(`INSERT OR REPLACE INTO preferencia (chave, valor) VALUES (?, ?)`, [chave, valor]);
}

/** Teto de check-ins olhados pra trás ao calcular a sequência — generoso o bastante na prática. */
const JANELA_SEQUENCIA = 60;

export async function estadoDerivado(db: DB, agora: number): Promise<EstadoDerivado> {
  const ultimo = await ultimoCheckin(db);
  if (!ultimo) {
    return { climaAtual: null, misturaAtual: null, sequencia: 0, ultimoCheckinEm: null, esmaecido: false };
  }
  const recentes = await climasRecentes(db, JANELA_SEQUENCIA);
  return {
    climaAtual: ultimo.clima,
    misturaAtual: ultimo.mistura,
    sequencia: calcularSequencia(recentes),
    ultimoCheckinEm: ultimo.em,
    esmaecido: isStale(ultimo.em, agora),
  };
}

export async function resumoDoDiaRepositorio(db: DB, dia: string): Promise<ResumoDia | null> {
  const checkins = await listarCheckinsDoDia(db, dia);
  const portoSeguro = await houvePortoSeguroNoDia(db, dia);
  return resumoDoDia(dia, checkins, portoSeguro);
}
