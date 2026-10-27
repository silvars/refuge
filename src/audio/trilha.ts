import { MotorAudio } from './MotorAudio';
import { configurarSessaoAudio } from './sessao';
import type { Pesos } from '@/domain/tipos';

// Trilha sonora global (ver 02-sdd.md, seção 8.2 — `useTrilha()`): um único MotorAudio para o
// app inteiro, que cada tela atualiza com a mistura/clima atual. Instanciado sob demanda (na
// primeira chamada), nunca mais de uma vez — `react-native-audio-api` não suporta múltiplos
// AudioContext simultâneos.

let motor: MotorAudio | null = null;
let pararSessao: (() => void) | null = null;

function motorAtivo(): MotorAudio {
  if (!motor) {
    motor = new MotorAudio();
    motor.iniciar();
    pararSessao = configurarSessaoAudio(motor);
  }
  return motor;
}

/** `null` = base neutra (sem check-in ainda). */
export function definirMisturaTrilha(pesos: Partial<Pesos> | null): void {
  motorAtivo().definirMistura(pesos);
}

/** Só mexe no volume se a trilha já estiver tocando — nunca liga o motor só por causa disso
 * (ex. abrir a tela de Ajuda antes do primeiro check-in não deve começar a tocar nada). */
export function definirVolumeGeralTrilhaSeAtiva(v: number): void {
  motor?.definirVolumeGeral(v);
}

export function pararTrilha(): void {
  pararSessao?.();
  motor?.descartar();
  motor = null;
  pararSessao = null;
}
