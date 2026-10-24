import { AppState, type AppStateStatus } from 'react-native';
import { AudioManager } from 'react-native-audio-api';

import type { MotorAudio } from './MotorAudio';

// Sessão de áudio: categoria iOS, interrupções (ligação/Siri/alarme) e segundo plano.
// Ver 02-sdd.md, seção 8.3. Decisão do MVP: categoria "ambient" (respeita a chave de
// silêncio, mistura com outros apps) — sem modo de segundo plano: ao sair do app,
// pausa (o som volta ao retornar).

/** Chamar uma vez, depois de `motor.iniciar()`. Retorna uma função para desativar tudo. */
export function configurarSessaoAudio(motor: MotorAudio): () => void {
  AudioManager.setAudioSessionOptions({ iosCategory: 'ambient' });
  AudioManager.observeAudioInterruptions(true);

  const assinaturaInterrupcao = AudioManager.addSystemEventListener('interruption', (evento) => {
    if (evento.type === 'began') {
      motor.pausar();
    } else if (evento.type === 'ended' && evento.shouldResume) {
      motor.retomar();
    }
  });

  function aoMudarEstadoDoApp(estado: AppStateStatus) {
    if (estado === 'background') {
      motor.pausar();
    } else if (estado === 'active') {
      motor.retomar();
    }
  }
  const assinaturaAppState = AppState.addEventListener('change', aoMudarEstadoDoApp);

  return () => {
    assinaturaInterrupcao?.remove();
    assinaturaAppState.remove();
    AudioManager.observeAudioInterruptions(false);
  };
}
