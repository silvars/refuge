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

export function pararTrilha(): void {
  pararSessao?.();
  motor?.descartar();
  motor = null;
  pararSessao = null;
}
