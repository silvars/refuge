import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Preferência "reduzir movimento" do sistema (VoiceOver/TalkBack), atualizada ao vivo. */
export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false);

  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (ativo) setReduzir(valor);
    });
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzir);
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);

  return reduzir;
}
