import * as Haptics from 'expo-haptics';

// Vibração suave (ver 02-sdd.md, seção 9; especificação F6). Sempre checar a preferência
// `preferencias.vibracao` antes de chamar — este módulo não lê store nenhuma sozinho.

export async function hapticEscolha(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Toque duplo suave ao revelar o clima (ver especificação F6). */
export async function hapticRevelarClima(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await new Promise((resolve) => setTimeout(resolve, 70));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Toque de amostra ao religar vibração em Ajustes. */
export async function hapticAmostra(): Promise<void> {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
