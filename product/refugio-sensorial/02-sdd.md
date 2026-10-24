# Refúgio Sensorial — Software Design Document (SDD)

> **Objetivo:** guiar a implementação do MVP descrito em `01-especificacao-produto.md`.
> **Público:** você e o agente de IA que vai codar.
> **Regra de ouro:** em caso de dúvida de *comportamento*, a especificação manda; em caso de dúvida de *valor exato* (tempo, cor, peso), valem `conteudo/*.json` e `motor/*.js`.

---

## 1. Decisão de plataforma

**React Native + Expo (development build), TypeScript, iOS e Android a partir de um código só.**

| Por quê | Detalhe |
| --- | --- |
| Uma pessoa mantém | Ajuste fino de cor, som e ritmo acontece uma vez, não duas |
| Tudo tem suporte | Skia (GPU) para degradês, forma de pontos e Nebulosa; Reanimated para transições; módulos prontos para háptico, notificações locais, armazenamento seguro |
| Som reaproveitável | `react-native-audio-api` (Software Mansion) segue a especificação Web Audio: `motor/motor-audio.js` porta quase direto |

**Não roda no Expo Go** (módulos nativos de áudio e banco criptografado). Usar `npx expo run:ios` / `run:android` ou EAS Build.

**Saída de emergência:** se a prova de conceito de áudio falhar (seção 13, Fase 0), escrever um módulo nativo só para o áudio (AVAudioEngine no iOS, Oboe no Android) e manter o resto em RN.

---

## 2. Stack

| Camada | Biblioteca | Uso |
| --- | --- | --- |
| Base | Expo SDK (versão estável atual), React Native, TypeScript estrito | — |
| Navegação | expo-router (stack) | Telas e deep links dos lembretes |
| Estado | zustand (+ persistência própria no SQLite) | Estado de sessão e preferências |
| Gráficos | @shopify/react-native-skia | Degradês compostos, forma de pontos, Nebulosa, vidro (BackdropBlur) |
| Animação | react-native-reanimated | Transições de tela/pergunta, interpolação de cor, `useFrameCallback` |
| Áudio | react-native-audio-api | Motor de som em tempo real |
| Háptico | expo-haptics | Toques ao responder e ao revelar o clima |
| Notificações | expo-notifications (somente locais) | Lembretes e mensagens de apoio |
| Contatos | expo-contacts (`presentContactPickerAsync`) ou módulo nativo do picker | Escolher 1 contato sem ler a agenda |
| Telefone | libphonenumber-js | Normalização E.164 |
| Banco | op-sqlite com SQLCipher | Histórico local criptografado |
| Segredos | expo-secure-store | Chave do banco (Keychain/Keystore) |
| Biometria | expo-local-authentication | Bloqueio opcional do app |
| Fontes | expo-font + @expo-google-fonts/urbanist e /roboto | Tipografia |
| Conteúdo | JSON empacotado + EAS Update (OTA) | Frases e perguntas sem nova versão de loja |
| Testes | Jest (lógica), React Native Testing Library, Maestro (E2E) | — |

> Confirmar versões compatíveis com o SDK Expo no momento da criação do projeto. Pinar versões exatas.

---

## 3. Estrutura de pastas

```
app/                          # expo-router
  _layout.tsx                 # fontes, providers, barra superior, botão Ajuda global
  index.tsx                   # redireciona: onboarding ou principal
  onboarding/
    boas-vindas.tsx
    conteudo.tsx
    fone.tsx
  vamos-comecar.tsx
  checkin/
    index.tsx                 # perguntas (P1..P8) + transições
    pausa.tsx                 # também usada no modo "respiro"
    etiquetas.tsx
    resultado.tsx
  principal.tsx
  porto-seguro/
    index.tsx
    acolhimento.tsx
  nebulosa.tsx
  ajustes.tsx
  sobre.tsx
  ajuda.tsx                   # modal, presentation: 'fullScreenModal'
src/
  domain/
    clima.ts                  # porta de motor/motor-clima.js (funções puras)
    tipos.ts
    selecaoFrases.ts
    agendamento.ts            # regras de lembretes e mensagens de apoio
  audio/
    MotorAudio.ts             # porta de motor/motor-audio.js
    sessao.ts                 # categoria/interrupções/segundo plano
  visual/
    FundoClima.tsx            # 3 degradês compostos + neutro + esmaecido
    FormaPontos.tsx           # porta de RefugioForma (Skia)
    Nebulosa.tsx              # porta de RefugioNebulosa (Skia)
    Vidro.tsx                 # card/botão de vidro
    tokens.ts                 # cores, tipografia, durações (seção 8 da especificação)
  data/
    db.ts                     # abertura do SQLite com chave do secure-store
    migracoes.ts
    repositorios.ts
  conteudo/                   # cópia de ../conteudo/*.json + validação de esquema
  haptics.ts
  contatos.ts                 # picker + normalização + abertura WhatsApp/SMS
  notificacoes.ts
  store.ts                    # zustand
```

---

## 4. Modelo de domínio

```ts
export type Clima = 'tempestade' | 'nevoa' | 'clareira';
export type Pesos = Record<Clima, number>;          // pesos brutos ou frações
export type Mistura = Record<Clima, number>;        // porcentagens inteiras (somam ~100)

export interface Opcao { id: string; texto: string; pesos: Partial<Pesos>; }
export interface Pergunta { id: string; dimensao: string; texto: string; opcoes: Opcao[]; }

export interface SessaoCheckin {
  id: string;
  iniciadoEm: number;
  ordens: number[][];                 // índices embaralhados por pergunta (fixos na sessão)
  respostas: (number | null)[];       // índice ORIGINAL da opção em cada pergunta
  pausaFeita: boolean;
  climaAnterior: Clima | null;
}

export interface Checkin {
  id: string;
  em: number;                         // epoch ms
  clima: Clima;
  mistura: Mistura;
  respostas: { perguntaId: string; opcaoId: string }[];
  etiquetas: string[];
}

export interface Preferencias {
  linhas: { neutra: boolean; espiritual: boolean; filosofica: boolean };
  som: boolean;
  vibracao: boolean;
  lembretes: boolean;
  mensagensApoio: boolean;            // padrão false
  bloqueio: boolean;
  silencio: { inicio: string; fim: string };  // '22:00' / '08:00'
  onboardingFeito: boolean;
}

export interface EstadoDerivado {
  climaAtual: Clima | null;           // do último check-in
  misturaAtual: Mistura | null;
  sequencia: number;                  // check-ins seguidos em tempestade/nevoa
  ultimoCheckinEm: number | null;
  esmaecido: boolean;                 // agora - ultimoCheckinEm > 12h
}
```

---

## 5. Banco de dados (SQLite + SQLCipher)

```sql
CREATE TABLE checkin (
  id TEXT PRIMARY KEY,
  em INTEGER NOT NULL,                -- epoch ms
  dia TEXT NOT NULL,                  -- 'YYYY-MM-DD' no fuso do aparelho
  clima TEXT NOT NULL CHECK (clima IN ('tempestade','nevoa','clareira')),
  mix_tempestade INTEGER NOT NULL,
  mix_nevoa INTEGER NOT NULL,
  mix_clareira INTEGER NOT NULL,
  etiquetas TEXT NOT NULL DEFAULT '[]'  -- JSON
);
CREATE INDEX idx_checkin_dia ON checkin(dia);

CREATE TABLE resposta (
  checkin_id TEXT NOT NULL REFERENCES checkin(id) ON DELETE CASCADE,
  pergunta_id TEXT NOT NULL,
  opcao_id TEXT NOT NULL,
  PRIMARY KEY (checkin_id, pergunta_id)
);

CREATE TABLE evento_dia (             -- marcas sem dado pessoal de terceiros
  dia TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('porto_seguro')),
  em INTEGER NOT NULL
);

CREATE TABLE frase_exibida (          -- para nao_repetir_dias
  frase_id TEXT NOT NULL,
  em INTEGER NOT NULL
);

CREATE TABLE preferencia (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
CREATE TABLE meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);  -- versao_schema, sequencia
```

**Resumo do dia (Nebulosa)** é calculado na leitura: soma das misturas dos check-ins do dia (média), clima predominante, contagem, etiquetas (união), marca de Porto Seguro.

**Nunca guardar:** nome, número ou ID do contato do Porto Seguro; texto da mensagem enviada.

**Chave:** 32 bytes aleatórios gerados no primeiro uso, guardados em `expo-secure-store` com `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` (não migra em backup).

**Backup:**
- iOS: arquivo do banco em `Library/` com `NSURLIsExcludedFromBackupKey = true` (ou em `Library/Caches` não é aceitável, pois o sistema pode apagar) — usar a exclusão explícita.
- Android: `android:allowBackup="false"` e `dataExtractionRules` excluindo o banco.

**Apagar tudo:** fechar o banco, apagar arquivo, apagar chave, limpar notificações agendadas, voltar ao onboarding.

---

## 6. Motor de clima

Porta direta de `motor/motor-clima.js` para `src/domain/clima.ts`, com testes unitários (seção 12).

| Função | Regra |
| --- | --- |
| `totals(perguntas, respostas, climaAnterior)` | Soma dos pesos + clima anterior × 1,5 |
| `layerOpacities(pesos)` | Opacidades para compor 3 degradês empilhados: tempestade = 1 (base), névoa = wn / (1 − wc), clareira = wc. Neutro sempre 1 por baixo. Resultado = média ponderada exata |
| `isLight(pesos, esmaecido)` | wc ≥ 0,55 e não esmaecido → tinta escura |
| `finish(perguntas, respostas)` | Clima predominante (sem anterior) + mistura em %; desempate pela resposta mais recente |
| `dominant(pesos)` | Para escolher a pausa |
| `nextStreak`, `shouldSuggestPorto` (≥ 3), `isStale` (> 12 h) | Regras da especificação 4.3 e 4.4 |
| `shuffleOrders(perguntas)` | Fisher–Yates por pergunta, uma vez por sessão |

**Atenção:** respostas guardam o **índice original** da opção; a ordem embaralhada é só de apresentação.

**Pesos de cor fora do check-in:** mistura do último check-in (frações). Sem check-in: neutro.

---

## 7. Renderização

### 7.1 FundoClima

Skia `<Canvas>` em tela cheia, 5 camadas: neutro `#0E0E14` (sempre 1) · degradê Tempestade · degradê Névoa · degradê Clareira · sobreposição de esmaecimento `#3A3A44`.
- Opacidades vêm de `layerOpacities` e são animadas com `withTiming(2800, Easing.bezier(0.45,0,0.25,1))` em shared values.
- Esmaecimento: 0 → 0,55 com a mesma curva.
- Cor do texto: interpolar entre `#FCFCFC` e `#231F20` em 1,6 s.

### 7.2 Vidro

`<BackdropBlur blur={14}>` + retângulo arredondado com o token de vidro + borda de 1 px com o token de fio. Em Android de baixo desempenho, permitir fallback sem desfoque (só translucidez).

### 7.3 FormaPontos

Porta de `RefugioForma`:
- Pré-calcular N pontos da esfera de Fibonacci (1.400; 900 em telas < 220 dp de lado da forma).
- Em `useFrameCallback`: atualizar fase, rotação e respiração; projetar pontos em um `Float32Array` (x, y, raio, alfa).
- Desenhar com Skia `Points`/`Circle` em lote via `Picture` ou `Atlas`. Alternativa de alto desempenho: shader de vértice/fragmento no Skia (`RuntimeEffect`) recebendo fase/rotação como uniforms.
- **Parâmetros interpolados por quadro** (amp, velocidade, rotação, cor) com fator `min(1, dt * 0.8)`, como no motor.
- Configurações por contexto em `conteudo/estados.json` e `conteudo/respiracao.json`.
- **Orçamento:** ≥ 55 fps em aparelho intermediário. Se cair abaixo de 50 fps de forma sustentada, reduzir pontos para 600.
- "Reduzir movimento": desenhar um quadro estático.

### 7.4 Pausa: sincronia

O ciclo da forma (P, inFrac) e os rótulos "Inspire…/Solte…" partem do **mesmo relógio** (tempo de montagem da tela). Os rótulos trocam por fase (`u < inFrac` → inspira), com fade de 300 ms.

### 7.5 Nebulosa

Porta de `RefugioNebulosa` em Skia:
- Posição do dia d: ângulo `d * 0.58 + 0.4`, raio `14 + d * 4.5`, achatamento vertical 0,9, jitter determinístico (`seeded(d)`).
- Névoa semanal: `RadialGradient` raio 95 com cor média, `blendMode="plus"`.
- Estrelas: brilho radial (raio = tamanho × 5) + núcleo clareado 45% para o branco; tamanho `2.2 + checkins * 1.1`; hoje pulsa (±22%, 2,2 rad/s).
- Fio da espiral 8%; poeira de fundo 170 pontos cintilando.
- Toque: `hitTest` com raio de 26 px; mês corrente até hoje.
- Descrição acessível: `accessibilityLabel` com o resumo da semana; fase seguinte, lista navegável.

### 7.6 Transições

- **Tela:** `entering={FadeInDown.duration(700)}` (deslocamento 8 px) ou equivalente customizado.
- **Pergunta (seção F2 da especificação):** máquina de fases `idle → pick (0,48 s) → leave (0,57 s) → next`. Palavras como `Animated.Text` individuais com atraso `250 + i*90 ms`, blur 5 → 0 (Skia `Blur` ou opacidade+translate se blur ficar pesado), opções com atraso `250 + palavras*90 + 450 + i*170 ms`. Bloquear toques enquanto `fase !== 'idle'`.
- **"Vamos começar?":** atrasos 0,4 / 1,8 / 3,2 / 4,2 s, 1,4 s cada.

---

## 8. Áudio

### 8.1 Porta do motor

`src/audio/MotorAudio.ts` = `motor/motor-audio.js` sobre `react-native-audio-api`:
- Mesmos nós: `AudioBufferSourceNode` (ruído rosa em loop), `BiquadFilterNode`, `OscillatorNode` (LFOs, binaural, pad), `StereoPannerNode`, `ChannelMergerNode`, `GainNode`.
- **Agendador:** no protótipo é `setInterval(120 ms)`. No app, usar um timer em JS com antecedência (lookahead) de ~150 ms baseado em `context.currentTime`; para robustez em segundo plano, preferir eventos agendados com antecedência maior (2–4 s) ou um worklet se disponível.
- Verificar no início do projeto a cobertura da biblioteca para: `StereoPannerNode`, `ChannelMergerNode`, `setTargetAtTime`, `exponentialRampToValueAtTime`, `detune`. Onde faltar, substituir (ex.: pan por dois ganhos L/R; merger por buffer estéreo pré-renderizado para o binaural).

### 8.2 API do módulo

```ts
interface MotorAudio {
  iniciar(): Promise<void>;                 // após primeira interação/onboarding
  definirMistura(p: Pesos | null): void;    // null = base neutra
  definirVolumeGeral(v: number): void;      // regras por tela (especificação 7.2)
  definirTeste(ligado: boolean): void;
  pausar(): void; retomar(): void;
  descartar(): void;
}
```

Um hook `useTrilha()` observa tela atual + mistura + preferências e chama `definirMistura`/`definirVolumeGeral` (porta de `RefugioAudio.masterForScreen`).

### 8.3 Sessão de áudio e ciclo de vida

- **iOS:** categoria `ambient` (respeita a chave de silêncio e mistura com outros apps) **ou** `playback` com `mixWithOthers` se quisermos tocar com a chave de silêncio ligada. Decisão do MVP: `ambient` (mais respeitoso). Sem modo de segundo plano no MVP: ao sair do app, fade para 0 e pausa.
- **Android:** foco de áudio "transient may duck"; pausar ao perder foco.
- **Interrupções** (ligação, Siri, alarme): pausar com fade; retomar ao voltar ao app.
- **Tela de ajuda:** volume 0,12 (o discador nativo assume na ligação).

### 8.4 Alternativa por loops

Se a síntese não ficar estável: tocar `audio/tempestade_loop.wav`, `nevoa_loop.wav`, `clareira_loop.wav` (24 s, emenda contínua) em paralelo, em loop, com ganhos = mistura. Converter para AAC/M4A perde a emenda contínua (padding do codificador): manter WAV ou usar CAF/Opus com loop por amostra. `audio/gerar_loops.py` regenera os arquivos.

---

## 9. Háptico

`src/haptics.ts`, respeitando `preferencias.vibracao`:

| Evento | Chamada |
| --- | --- |
| Escolher resposta | `Haptics.impactAsync(ImpactFeedbackStyle.Light)` |
| Revelar clima | `Haptics.notificationAsync(Success)` ou duas `Light` com 70 ms |
| Religar em Ajustes | uma `Light` de amostra |
| Fase futura: respiração | Core Haptics (módulo nativo) no início de cada fase |

---

## 10. Notificações locais

`src/domain/agendamento.ts` (função pura, testável) + `src/notificacoes.ts` (efeitos).

**Regras:**
1. Ao concluir check-in em Tempestade/Névoa e `lembretes = true`: cancelar lembrete pendente e agendar 1 entre +4 h e +12 h (sorteado), ajustado para fora do silêncio.
2. `mensagensApoio = true`: 1 por dia, horário sorteado na janela permitida (manhã 9–11 h ou fim de tarde 17–19 h conforme `momento` da frase), frase escolhida por clima atual + linha + não repetida em `nao_repetir_dias`.
3. **Teto global de 2 notificações por dia**; se estourar, prioridade para o lembrete de recalibração.
4. Reagendar ao abrir o app (o sistema pode descartar agendamentos).
5. Conteúdo: lembrete sempre "Um tempo se passou. Quer fazer um novo check-in?"; mensagens de apoio = texto da frase. **Nunca** nome do clima.
6. `data.rota`: `/vamos-comecar` (lembrete) ou `/principal` (apoio). Tratar toque com `addNotificationResponseReceivedListener` e na abertura a frio.

Permissão de notificação pedida **só** quando a pessoa ativa lembretes ou mensagens (não no onboarding).

---

## 11. Porto Seguro: contatos e envio

```ts
async function escolherContato(): Promise<{ primeiroNome: string; e164: string } | null>
function normalizarTelefone(bruto: string, paisPadrao = 'BR'): string | null  // libphonenumber-js
async function abrirMensagem(e164: string, texto: string): Promise<'whatsapp' | 'sms'>
```

- **Seletor:** `Contacts.presentContactPickerAsync()`. No iOS usa `CNContactPickerViewController`, sem permissão. **No Android, verificar** se o método exige `READ_CONTACTS`; se exigir, usar módulo nativo com `Intent.ACTION_PICK` em `ContactsContract.CommonDataKinds.Phone.CONTENT_URI` (não requer permissão).
- Contato com vários números: mostrar escolha simples; preferir celular.
- **WhatsApp:** `https://wa.me/${e164SemMais}?text=${encodeURIComponent(texto)}` via `Linking.openURL`.
  - iOS: declarar `whatsapp` em `LSApplicationQueriesSchemes` se usar `canOpenURL('whatsapp://')` para detecção.
  - Android 11+: declarar `<queries><package android:name="com.whatsapp"/></queries>` para detecção.
- **SMS (fallback):** iOS `sms:${e164}&body=${texto}`; Android `sms:${e164}?body=${texto}`.
- Ao voltar (`AppState` → active): navegar para acolhimento, gravar `evento_dia(porto_seguro)` e zerar `sequencia`.
- **Nada** do contato é persistido.

---

## 12. Testes

| Tipo | O quê |
| --- | --- |
| Unitário (Jest) | `clima.ts` (totals, layerOpacities = média exata, finish com empates, shuffle estável), `agendamento.ts` (silêncio, teto diário, não repetição), `normalizarTelefone` (casos: `(11) 98765-4321`, `+55 11 91234-5678`, `21 99876-1234`, `011 97777-1212`, fixo), `selecaoFrases.ts` |
| Componente | Check-in: fases bloqueiam toques; voltar preserva resposta; pausa escolhe tipo pelo estado |
| E2E (Maestro) | Onboarding completo; check-in → resultado → principal; Porto Seguro até abrir app externo; Ajuda a partir de 3 telas; apagar tudo |
| Manual | Som com fone, interrupções por ligação, reduzir movimento, leitor de tela (VoiceOver/TalkBack), fonte grande, aparelho Android intermediário (fps) |

---

## 13. Plano de entrega

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| **0. Provas de conceito (primeiro!)** | (a) Motor de áudio em `react-native-audio-api` com as 3 camadas e crossfade; (b) Forma de pontos em Skia a 55+ fps | Áudio estável 10 min, sobrevive a ligação e à troca de app; forma fluida no Android intermediário |
| 1. Fundação | Projeto Expo, tokens, fontes, FundoClima, Vidro, banco criptografado, store | Fundo muda por mistura com transição de 2,8 s |
| 2. Check-in | Perguntas, embaralhamento, transições, pausa, etiquetas, resultado, háptico | Fluxo completo grava check-in |
| 3. Principal + Ajuda | Tela principal, banners (esmaecido, sequência), botão Ajuda global, tela de ajuda | Ajuda acessível em 1 toque de qualquer tela |
| 4. Porto Seguro | Mensagem por clima, edição, picker, WhatsApp/SMS, acolhimento, respiro | Envio real para WhatsApp e fallback SMS |
| 5. Nebulosa | Céu, memória do dia, resumo da semana | Toque abre memória correta |
| 6. Ajustes + Notificações | Interruptores, apagar tudo, lembretes, mensagens de apoio, bloqueio | Regras de agendamento passam nos testes |
| 7. Polimento e loja | Acessibilidade, reduzir movimento, Sobre/créditos, política de privacidade, declarações de loja | Checklist da especificação (seções 9.4, 11, 12) |

**Definição de pronto (cada tela):** valores conferidos com os JSONs; funciona sem som e sem vibração; leitor de tela anuncia o essencial; reduzir movimento respeitado; nenhum dado emocional sai do aparelho.

---

## 14. Instruções para o agente de IA

1. Leia nesta ordem: `01-especificacao-produto.md` → este SDD → `conteudo/*.json` → `motor/*.js` → `prototipo/`.
2. **Comece pela Fase 0.** Não construa telas antes de validar áudio e forma de pontos no aparelho.
3. Porte `motor/*.js` para TypeScript **mantendo a matemática**; escreva os testes da seção 12 antes de usar as funções nas telas.
4. Não invente textos: use os JSONs. Textos novos entram nos JSONs com `revisado_por_profissional: false`.
5. Não adicione: servidor, conta, analytics sem opt-in, permissão de contatos, leitura de redes sociais, pergunta sobre morte/autolesão.
6. O protótipo (`prototipo/prototipo-jornada.dc.html`) é **referência de comportamento e ritmo**, não código a copiar: é um formato de template próprio (marcação com `{{ }}`, `<sc-if>`, `<sc-for>` e uma classe `Component` com `renderVals()`). A lógica em JavaScript dentro dele é legível e útil como guia.
7. `motor/demo-sensorial.html` roda em qualquer navegador (abrir o arquivo direto) e mostra cor, som, forma e Nebulosa reagindo à mistura.
8. Em qualquer conflito entre o protótipo e a especificação, **vale a especificação**.
