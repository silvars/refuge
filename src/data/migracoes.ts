import type { DB } from '@op-engineering/op-sqlite';

// Schema do banco criptografado (ver 02-sdd.md, seção 5). Cada entrada é uma versão; a versão
// aplicada fica em `meta.versao_schema`. Nunca editar uma migração já publicada — sempre
// adicionar uma nova ao final.
const MIGRACOES: readonly (readonly string[])[] = [
  // v1
  [
    `CREATE TABLE checkin (
      id TEXT PRIMARY KEY,
      em INTEGER NOT NULL,
      dia TEXT NOT NULL,
      clima TEXT NOT NULL CHECK (clima IN ('tempestade','nevoa','clareira')),
      mix_tempestade INTEGER NOT NULL,
      mix_nevoa INTEGER NOT NULL,
      mix_clareira INTEGER NOT NULL,
      etiquetas TEXT NOT NULL DEFAULT '[]'
    )`,
    `CREATE INDEX idx_checkin_dia ON checkin(dia)`,
    `CREATE TABLE resposta (
      checkin_id TEXT NOT NULL REFERENCES checkin(id) ON DELETE CASCADE,
      pergunta_id TEXT NOT NULL,
      opcao_id TEXT NOT NULL,
      PRIMARY KEY (checkin_id, pergunta_id)
    )`,
    `CREATE TABLE evento_dia (
      dia TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('porto_seguro')),
      em INTEGER NOT NULL
    )`,
    `CREATE TABLE frase_exibida (
      frase_id TEXT NOT NULL,
      em INTEGER NOT NULL
    )`,
    `CREATE TABLE preferencia (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`,
  ],
];

export const VERSAO_SCHEMA_ATUAL = MIGRACOES.length;

async function versaoAplicada(db: DB): Promise<number> {
  await db.execute(`CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`);
  const r = await db.execute(`SELECT valor FROM meta WHERE chave = 'versao_schema'`);
  const linha = r.rows[0];
  return linha ? Number(linha.valor) : 0;
}

/** Aplica as migrações pendentes (idempotente — não faz nada se já estiver na versão atual). */
export async function aplicarMigracoes(db: DB): Promise<void> {
  const versaoAtual = await versaoAplicada(db);
  if (versaoAtual >= VERSAO_SCHEMA_ATUAL) return;

  await db.transaction(async (tx) => {
    for (let v = versaoAtual; v < VERSAO_SCHEMA_ATUAL; v++) {
      for (const comando of MIGRACOES[v]) {
        await tx.execute(comando);
      }
    }
    await tx.execute(`INSERT OR REPLACE INTO meta (chave, valor) VALUES ('versao_schema', ?)`, [
      String(VERSAO_SCHEMA_ATUAL),
    ]);
  });
}
