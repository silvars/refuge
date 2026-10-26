import { open, type DB } from '@op-engineering/op-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { aplicarMigracoes } from './migracoes';

// Abertura do banco criptografado (ver 02-sdd.md, seção 5). SQLCipher precisa estar habilitado
// via "op-sqlite": { "sqlcipher": true } no package.json (ver nota lá) — sem isso, `encryptionKey`
// é ignorada silenciosamente e o banco fica em texto plano.

const CHAVE_SECURE_STORE = 'refugio_chave_banco';
const NOME_BANCO = 'refugio.db';
const TAMANHO_CHAVE_BYTES = 32;

function bytesParaHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function obterOuCriarChave(): Promise<string> {
  const existente = await SecureStore.getItemAsync(CHAVE_SECURE_STORE);
  if (existente) return existente;

  const chave = bytesParaHex(Crypto.getRandomBytes(TAMANHO_CHAVE_BYTES));
  // WHEN_UNLOCKED_THIS_DEVICE_ONLY: não migra em backup/restore pra outro aparelho (ver seção 5).
  await SecureStore.setItemAsync(CHAVE_SECURE_STORE, chave, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return chave;
}

let instancia: DB | null = null;

/** Abre (ou reaproveita) a conexão com o banco, já com as migrações aplicadas. */
export async function abrirBanco(): Promise<DB> {
  if (instancia) return instancia;
  const encryptionKey = await obterOuCriarChave();
  const db = open({ name: NOME_BANCO, encryptionKey });
  await aplicarMigracoes(db);
  instancia = db;
  return db;
}

/**
 * "Apagar todos os meus dados" (Ajustes) — fecha, apaga o arquivo e a chave. Notificações
 * agendadas e o retorno ao onboarding são responsabilidade de quem chama (fora do escopo desta
 * camada de dados).
 */
export async function apagarTudo(): Promise<void> {
  if (instancia) {
    instancia.close();
    instancia.delete();
    instancia = null;
  }
  await SecureStore.deleteItemAsync(CHAVE_SECURE_STORE);
}
