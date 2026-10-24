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

Versões checadas no registry do npm em **24/10/2026** — ver nota de atualização abaixo antes de instalar.

| Camada | Biblioteca | Versão atual | Uso |
| --- | --- | --- | --- |
| Base | Expo SDK | 58 (`58.0.19`) | Gerenciado (development build, não Expo Go — ver acima) |
| Base | react-native | `0.88.0` | Vem pinado pelo Expo SDK 58 |
| Base | react | `19.3.1` | Vem pinado pelo Expo SDK 58 |
| Base | typescript | `~6.0.3` (estrito) | Versão que o template oficial do Expo SDK 58 testa/pina. O npm tem `7.0.2` disponível (compilador nativo), mas o Expo ainda não validou contra ele — não forçar TS 7 até o próprio template do Expo adotar |
| Navegação | expo-router | `58.0.26` | Telas e deep links dos lembretes — vive em `src/app/` (convenção atual do template, não `app/` na raiz) |
| Estado | zustand | `5.0.16` | Estado de sessão e preferências |
| Gráficos | @shopify/react-native-skia | `2.14.0` | Degradês compostos, forma de pontos, Nebulosa, vidro (BackdropBlur) |
| Animação | react-native-reanimated | `4.7.1` | Transições de tela/pergunta, interpolação de cor, `useFrameCallback` |
| Áudio | react-native-audio-api | `0.13.6` (pré-1.0) | Motor de som em tempo real — validar na Fase 0 antes de confiar (ver saída de emergência acima) |
| Háptico | expo-haptics | `58.0.7` | Toques ao responder e ao revelar o clima |
| Notificações | expo-notifications (somente locais) | `58.1.6` | Lembretes e mensagens de apoio |
| Contatos | expo-contacts (`presentContactPickerAsync`) | `58.0.9` | Escolher 1 contato sem ler a agenda |
| Telefone | libphonenumber-js | `1.13.15` | Normalização E.164 |
| Banco | @op-engineering/op-sqlite com SQLCipher | `18.2.5` | Histórico local criptografado |
| Segredos | expo-secure-store | `58.0.2` | Chave do banco (Keychain/Keystore) |
| Biometria | expo-local-authentication | `58.0.2` | Bloqueio opcional do app |
| Fontes | expo-font + @expo-google-fonts/urbanist e /roboto | `58.0.10` | Tipografia |
| Conteúdo | JSON empacotado (fallback offline) + jsDelivr sobre o repositório público (atualização em background) | — | Frases e perguntas atualizáveis sem nova versão de loja e sem servidor próprio (ver seção 16) |
| Conteúdo (cache local) | expo-file-system | `58.0.11` | Guarda a versão mais recente do conteúdo baixada do CDN |
| Idioma | i18next + react-i18next | `26.5.10` / `17.1.8` | Catálogo de UI e seleção de texto do conteúdo dinâmico por locale |
| Idioma (detecção) | expo-localization | `58.0.5` | Locale do aparelho no primeiro uso |
| Lint/format | eslint + eslint-config-expo + prettier | `10.13.0` / `58.0.4` / `3.9.10` | Padrão de código, checado no CI (seção 2.1) |
| Testes | jest + jest-expo | `30.5.2` / `58.0.12` | Testes unitários/componente |
| Testes | @testing-library/react-native | `14.1.0` | Testes de componente |
| Testes (E2E) | Maestro CLI | `2.11.0` | Fluxos completos (onboarding, check-in, Porto Seguro) |
| Build/CI | eas-cli | `25.3.0` | Builds nativos e EAS Update (quando aplicável) |

> **Nota de atualização:** não instale essas versões à mão. Ao criar o projeto na Fase 1, use `npx create-expo-app` seguido de `npx expo install <pacote>` para cada dependência — o Expo resolve automaticamente a versão compatível com o SDK instalado (pode ser diferente do último lançamento do npm). Rode `npx expo install --check` periodicamente para alinhar. Para libs fora do ecossistema Expo (zustand, libphonenumber-js, i18next, etc.), `npm view <pacote> version` ou o Dependabot (seção 2.1) indicam a versão mais nova.
>
> **Node:** o toolchain do RN 0.88 exige Node `^22.13.0 || ^24.3.0 || >= 26.0.0` (Node 23.x, por exemplo, NÃO funciona). Projeto fixa `22` via `.nvmrc`/`engines`; usar `nvm use` antes de instalar.
>
> **Scaffold:** projeto Expo já criado na raiz do repositório (`npx create-expo-app`) na Fase 1 — estrutura de pastas desta seção já reflete o que foi gerado, não é mais só plano.
>
> **Vulnerabilidade conhecida sem fix (aceita por ora):** `npm audit` aponta `node-forge` e `zod` (ambos transitivos de `@expo/cli`, dependência do próprio `expo`) como alta severidade. Não há versão corrigida publicada por nenhum dos dois no momento (confirmado via GHSA-86w9-cpqp-85rv, `first_patched_version: null`); `npm audit fix --force` sugere rebaixar para `expo@44`, o que seria regressão grave — **não aplicar**. Reavaliar a cada `npx expo install --check`/atualização de SDK.

---

## 2.1 Qualidade, CI/CD e segurança de dependências

Repositório público (`github.com/silvars/refuge`) — isso dá acesso gratuito ao SonarQube Cloud e ao GitHub Actions sem custo. Config já commitada no repositório (ativa de verdade a partir da Fase 1, quando existir `package.json`):

| Ferramenta | Arquivo | O que faz |
| --- | --- | --- |
| Dependabot | `.github/dependabot.yml` | PR semanal agrupando atualizações menores/patch de `npm` e de `github-actions`; **nunca** abre PR de major de `expo`/`react-native`/`react` automaticamente |
| CI | `.github/workflows/ci.yml` | lint + checagem de tipos + testes com cobertura em cada push/PR; pula graciosamente até existir `package.json` |
| SonarQube Cloud | `.github/workflows/sonarqube.yml` + `sonar-project.properties` | Análise de qualidade/segurança (bugs, code smells, vulnerabilidades, cobertura) em cada push/PR via `SonarSource/sonarqube-scan-action@v8` |

**Passos manuais (fora do alcance do agente, precisam da sua conta):**
1. Criar conta em [sonarcloud.io](https://sonarcloud.io) com login do GitHub, importar o repositório `silvars/refuge`.
2. Conferir se a organização/`projectKey` geradas batem com `sonar-project.properties` (hoje: `silvars` / `silvars_refuge`); ajustar se o SonarQube Cloud sugerir outra chave.
3. Gerar um token e salvar como secret `SONAR_TOKEN` em *Settings → Secrets and variables → Actions* do repositório.
4. (Opcional) Configurar o quality gate para bloquear merge de PR que não passar — adicionar `sonar.qualitygate.wait=true` em `sonar-project.properties` faz o workflow falhar quando o quality gate reprovar.

**Política de atualização de dependências:**
- Patches e minors (qualquer lib): Dependabot abre PR agrupado semanalmente; CI + Sonar validam antes do merge.
- Majors de libs comuns (zustand, libphonenumber-js, i18next, etc.): Dependabot propõe, revisão manual antes do merge.
- Majors de `expo`/`react-native`/`react`: **nunca** via Dependabot — seguir o guia oficial de upgrade do Expo (`npx expo install --check`, changelog do SDK) em um PR dedicado, testado manualmente nas duas plataformas antes do merge.
- Nenhuma dependência nova entra no projeto sem necessidade clara; preferir o que já está na seção 2 antes de adicionar biblioteca nova.

---

## 3. Estrutura de pastas

> Atualizado para a convenção do template oficial `create-expo-app` (SDK 58+): o expo-router vive em `src/app/` (não mais `app/` na raiz), com alias `@/*` apontando para `src/*` (ver `tsconfig.json`). `ios/`/`android/` não existem no repo — são gerados sob demanda (Continuous Native Generation) a partir de `app.json`.

```
src/
  app/                         # expo-router — cada arquivo aqui é uma tela
    _layout.tsx                # fontes, providers, barra superior, botão Ajuda global
    index.tsx                  # redireciona: onboarding ou principal
    onboarding/
      boas-vindas.tsx
      conteudo.tsx
      fone.tsx
    vamos-comecar.tsx
    checkin/
      index.tsx                # perguntas (P1..P8) + transições
      pausa.tsx                # também usada no modo "respiro"
      etiquetas.tsx
      resultado.tsx
    principal.tsx
    porto-seguro/
      index.tsx
      acolhimento.tsx
    nebulosa.tsx
    ajustes.tsx
    sobre.tsx
    ajuda.tsx                  # modal, presentation: 'fullScreenModal'
  components/                  # componentes de UI reutilizáveis (fora de app/, por convenção do template)
  hooks/
  constants/
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
  conteudo/                   # ver seção 16: bundled/ (fallback offline) + index.ts (fachada) + remoto.ts (fetch CDN) + esquema.ts (validação)
  i18n/
    index.ts                 # init do i18next, detecção de locale, troca em runtime
    locales/
      pt-BR/common.json       # textos fixos de UI (botões, telas, acessibilidade)
      en/common.json
      fr/common.json
      es/common.json
    textoLocalizado.ts        # helper: resolve campo multi-locale do conteudo/*.json com fallback para pt-BR
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
| i18n (Jest) | `textoLocalizado.ts` (fallback para pt-BR quando falta tradução, nunca retorna vazio/null), troca de idioma reflete no `lang` do app, seleção de frases nunca escolhe entrada pendente no idioma ativo |
| Conteúdo remoto (Jest) | `remoto.ts`: ignora payload com esquema inválido; não sobrescreve local quando `versao` remota não é maior; nunca lança exceção sem rede (offline simulado); `index.ts` nunca bloqueia leitura esperando o fetch |
| Manual | Som com fone, interrupções por ligação, reduzir movimento, leitor de tela (VoiceOver/TalkBack) nos 4 idiomas, fonte grande, aparelho Android intermediário (fps), abrir o app em modo avião após instalar (conteúdo bundled deve funcionar) |

---

## 13. Plano de entrega

| Fase | Entrega | Pronto quando |
| --- | --- | --- |
| **0. Provas de conceito (primeiro!)** | (a) Motor de áudio em `react-native-audio-api` com as 3 camadas e crossfade; (b) Forma de pontos em Skia a 55+ fps | Áudio estável 10 min, sobrevive a ligação e à troca de app; forma fluida no Android intermediário |
| 1. Fundação + i18n + conteúdo dinâmico | Projeto Expo, tokens, fontes, FundoClima, Vidro, banco criptografado, store, **infraestrutura de i18n** (i18next, detecção de locale, reestruturação dos `conteudo/*.json` multi-locale, troca de idioma em Ajustes), **carregador de conteúdo** (`src/conteudo/`: bundled + fetch via jsDelivr + cache em FileSystem, ver seção 16) | Fundo muda por mistura com transição de 2,8 s; trocar o idioma em Ajustes muda a UI inteira na hora; app abre e funciona sem internet usando o conteúdo empacotado |
| 2. Check-in | Perguntas, embaralhamento, transições, pausa, etiquetas, resultado, háptico — todos os textos via i18n | Fluxo completo grava check-in nos 4 idiomas |
| 3. Principal + Ajuda | Tela principal, banners (esmaecido, sequência), botão Ajuda global, tela de ajuda | Ajuda acessível em 1 toque de qualquer tela, nos 4 idiomas |
| 4. Porto Seguro | Mensagem por clima, edição, picker, WhatsApp/SMS, acolhimento, respiro | Envio real para WhatsApp e fallback SMS, mensagem no idioma ativo |
| 5. Nebulosa | Céu, memória do dia, resumo da semana | Toque abre memória correta |
| 6. Ajustes + Notificações | Interruptores, apagar tudo, lembretes, mensagens de apoio, bloqueio, seletor de idioma | Regras de agendamento passam nos testes; idioma persiste entre sessões |
| 7. Conteúdo traduzido | Tradução/revisão humana de todo `conteudo/*.json` para en/fr/es (perguntas, frases, Porto Seguro, respiração, etiquetas), com as fontes bíblicas/filosóficas por idioma (ver especificação, seção 16) | Meta de frases por clima/linha atingida nos 4 idiomas; zero entradas `pendente: true` ativas |
| 8. Polimento e loja | Acessibilidade, reduzir movimento, Sobre/créditos (por idioma), política de privacidade (4 idiomas), declarações de loja | Checklist da especificação (seções 9.4, 11, 12, 16) |

**Definição de pronto (cada tela):** valores conferidos com os JSONs; funciona sem som e sem vibração; leitor de tela anuncia o essencial; reduzir movimento respeitado; nenhum dado emocional sai do aparelho; nenhum texto hardcoded fora do i18n.

> A Fase 7 (tradução de conteúdo) pode rodar em paralelo às Fases 2–6 assim que a infraestrutura da Fase 1 estiver pronta — a estrutura técnica não depende do texto final estar pronto, já que todo campo multi-locale tem fallback para pt-BR. Publicar uma tradução nova é só editar o JSON em `product/refugio-sensorial/conteudo/`, subir a versão e dar `git push` (seção 16.4) — não exige nova build do app.

---

## 14. Instruções para o agente de IA

1. Leia nesta ordem: `01-especificacao-produto.md` → este SDD → `conteudo/*.json` → `motor/*.js` → `prototipo/`.
2. **Comece pela Fase 0.** Não construa telas antes de validar áudio e forma de pontos no aparelho.
3. Porte `motor/*.js` para TypeScript **mantendo a matemática**; escreva os testes da seção 12 antes de usar as funções nas telas.
4. Não invente textos: use os JSONs. Textos novos entram nos JSONs com `revisado_por_profissional: false`.
5. Não adicione: servidor, conta, analytics sem opt-in, permissão de contatos, leitura de redes sociais, pergunta sobre morte/autolesão.
6. O protótipo (`prototipo/prototipo-jornada.dc.html`) é **referência de comportamento e ritmo**, não código a copiar: é um formato de template próprio (marcação com `{{ }}`, `<sc-if>`, `<sc-for>` e uma classe `Component` com `renderVals()`). A lógica em JavaScript dentro dele é legível e útil como guia. Os textos fixos em português no protótipo são só referência visual, não fonte de verdade do texto (a fonte é `conteudo/*.json`).
7. `motor/demo-sensorial.html` roda em qualquer navegador (abrir o arquivo direto) e mostra cor, som, forma e Nebulosa reagindo à mistura.
8. Em qualquer conflito entre o protótipo e a especificação, **vale a especificação**.
9. **Nunca escreva texto visível diretamente no código.** Textos de UI vão em `src/i18n/locales/<idioma>/common.json`; textos de conteúdo dinâmico vêm dos campos multi-locale de `conteudo/*.json` (ver seção 15). Texto novo sem tradução para todos os 4 idiomas entra com o idioma faltante marcado como pendente, nunca com string vazia.
10. Ver seção 15 para o desenho técnico completo de internacionalização antes de montar qualquer tela.

---

## 15. Internacionalização (i18n)

Decisão de produto completa na especificação, seção 16. Esta seção cobre só o **como implementar**.

### 15.1 Esquema multi-locale do conteúdo

Cada campo de texto em `conteudo/*.json` vira um mapa por idioma em vez de uma string solta, mantendo um único arquivo por domínio (não duplicar perguntas/pesos/ids 4 vezes):

```json
{
  "id": "mente_1",
  "pesos": { "tempestade": 1 },
  "texto": {
    "pt-BR": "Uma represa cheia, prestes a transbordar",
    "en": null,
    "fr": null,
    "es": null
  }
}
```

- `null` = tradução pendente. **Nunca** string vazia (`""`), que é ambígua com "traduzido e vazio por decisão de conteúdo".
- Dados que não são texto (pesos, cores, tempos, ids) continuam únicos, fora do mapa de locale.
- `idioma_origem: "pt-BR"` em cada arquivo documenta a fonte de verdade para revisão.

### 15.2 Helper de resolução (`src/i18n/textoLocalizado.ts`)

```ts
function textoLocalizado<T extends Record<string, string | null>>(
  campo: T,
  idioma: Idioma,
  idiomaOrigem: Idioma = 'pt-BR'
): string {
  return campo[idioma] ?? campo[idiomaOrigem] ?? '';
}
```

- Fallback automático para `pt-BR` quando a entrada do idioma ativo está `null`.
- `selecaoFrases.ts` (motor de escolha de frases) deve **excluir da rotação** qualquer frase com `texto[idiomaAtivo] === null`, usando diretamente o fallback só quando não houver nenhuma frase traduzida disponível naquele clima/linha — preferir mostrar menos frases traduzidas a mostrar pt-BR misturado no meio de outro idioma.

### 15.3 UI estática

- `i18next` + `react-i18next`, inicializado em `src/i18n/index.ts`.
- Catálogo em `src/i18n/locales/<idioma>/common.json` (chaves por tela: `onboarding.boasVindas.titulo`, `ajuda.cvv.rotulo`, etc.).
- `expo-localization` detecta `Localization.getLocales()[0].languageCode` no primeiro uso; se não for `pt|en|fr|es`, usa `pt-BR`.
- Idioma escolhido manualmente é salvo em `preferencia(chave='idioma')` (tabela da seção 5) e tem prioridade sobre a detecção em usos futuros.
- Troca de idioma chama `i18n.changeLanguage()` e atualiza `lang`/`accessibilityLanguage` dos componentes nativos (leitor de tela).

### 15.4 Bíblia e filosofia por idioma

Ver especificação seção 16.3–16.4 para as versões por idioma. No schema, cada frase ganha `fonte` por idioma quando a referência muda (ex. numeração de versículo é igual, mas o crédito de tradução muda):

```json
"creditos_biblia": {
  "pt-BR": "Bíblia Livre (BLIVRE) — Creative Commons Atribuição",
  "en": "World English Bible — domínio público",
  "fr": "Louis Segond (1910) — domínio público",
  "es": "Reina-Valera Antigua (1909) — domínio público"
}
```

### 15.5 O que não é i18n

Números de ajuda (CVV/SAMU), regras do motor de clima, pesos, tempos de animação e cores **não variam por idioma** (ver especificação, seção 16.6).

---

## 16. Entrega de conteúdo (sem servidor próprio)

**Problema:** `conteudo/*.json` (perguntas, frases, mensagens, etc.) precisa ser fácil de editar e publicar sem passar por uma nova versão de loja, mas o app **não tem servidor nem banco remoto** (seção 11 da especificação). Solução: usar o próprio repositório Git (público) como fonte estática, com fallback total offline.

### 16.1 As 3 camadas

| Camada | O que é | Quando é usada |
| --- | --- | --- |
| **1. Fonte de verdade** | `product/refugio-sensorial/conteudo/*.json`, versionado no Git | Onde você/o agente edita conteúdo |
| **2. Empacotado no app (bundled)** | Cópia de build-time dentro do app, importada direto pelo JS (`import estados from './conteudo/bundled/estados.json'`) | Sempre disponível, garante que o app funciona **sem internet desde a primeira instalação** |
| **3. Remoto (CDN gratuito)** | Mesmos arquivos servidos via [jsDelivr](https://www.jsdelivr.com/) apontando para o repositório público: `https://cdn.jsdelivr.net/gh/silvars/refuge@main/product/refugio-sensorial/conteudo/<arquivo>.json` | Checado em background na abertura do app; se tiver versão mais nova, baixa e passa a valer |

Não existe banco de dados nem servidor próprio: o GitHub serve os arquivos crus, o jsDelivr só faz cache/CDN na frente (gratuito, sem conta, sem chave de API).

### 16.2 Fluxo de leitura no app

```
abrir app
  → ler conteúdo de: cache local (FileSystem) se existir, senão bundled
  → renderizar a tela imediatamente com isso (nunca espera rede)
  → em paralelo, em background: buscar versao de cada JSON no CDN
      → se versao remota > versao local conhecida:
          → baixar o JSON novo
          → validar esquema (idiomas, chaves esperadas, nada de HTML/script)
          → se válido: salvar em FileSystem e marcar como "versão ativa"
          → se inválido ou falhar (sem internet, erro 404, JSON quebrado): ignorar silenciosamente, continuar com o que já tinha
  → próxima abertura do app (ou próxima tela que lê aquele conteúdo) já usa a versão nova
```

- **Nunca** bloqueia a tela esperando a rede. O fetch é best-effort, silencioso, sem spinner.
- **Nunca** quebra o app com conteúdo remoto malformado — esquema inválido é descartado, loga localmente (sem enviar a lugar nenhum).
- Nenhum dado pessoal/emocional é enviado nesse fetch — é um `GET` anônimo de um arquivo público; não conflita com a seção 11 (privacidade) da especificação.

### 16.3 Implementação (`src/conteudo/`)

```
src/conteudo/
  bundled/                   # cópia espelhada de product/refugio-sensorial/conteudo/*.json
  index.ts                   # fachada: getEstados(), getPerguntas(), getFrases(), ... com a cadeia de fallback
  remoto.ts                  # fetch + comparação de `versao` + gravação em FileSystem
  esquema.ts                 # validação (zod ou checagem manual das chaves/idiomas esperados)
```

```ts
// remoto.ts (esboço)
const BASE = 'https://cdn.jsdelivr.net/gh/silvars/refuge@main/product/refugio-sensorial/conteudo';

async function atualizarSeNecessario(arquivo: string): Promise<void> {
  try {
    const remoto = await fetch(`${BASE}/${arquivo}.json`).then(r => r.json());
    if (!validaEsquema(arquivo, remoto)) return;
    const local = await lerVersaoLocal(arquivo);
    if (compareVersoes(remoto.versao, local) > 0) {
      await FileSystem.writeAsStringAsync(caminhoLocal(arquivo), JSON.stringify(remoto));
    }
  } catch {
    // offline ou CDN fora do ar: silenciosamente mantém o que já tem
  }
}
```

- `index.ts` expõe `getEstados()` etc. que leem **sempre** do FileSystem se existir, senão do `bundled/`; nunca chamam rede diretamente (quem chama rede é `remoto.ts`, de forma assíncrona e desacoplada da leitura).
- Script `scripts/sync-conteudo.js` (ou npm script `prebuild`) copia `product/refugio-sensorial/conteudo/*.json` para `src/conteudo/bundled/` antes de cada build — mantém uma única fonte editável (`product/`), sem duplicar manualmente.

### 16.4 Publicar conteúdo novo (runbook)

1. Editar o(s) arquivo(s) em `product/refugio-sensorial/conteudo/`.
2. Incrementar o campo `"versao"` do(s) arquivo(s) alterado(s) (ex. `"2.0"` → `"2.1"`).
3. Commit + `git push` para `main`.
4. (Opcional, acelera a propagação — jsDelivr cacheia por até ~7 dias em `@main`) Purgar o cache: `curl https://purge.jsdelivr.net/gh/silvars/refuge@main/product/refugio-sensorial/conteudo/<arquivo>.json`.
5. Quem tiver internet recebe o conteúdo novo na próxima abertura do app; sem internet, continua no conteúdo anterior (cache ou bundled) sem erro nenhum.

**Alternativa mais previsível de cache:** apontar para uma **tag/release Git** em vez de `@main` (ex. `@conteudo-2026-10-24`) e mover a tag a cada publicação — evita qualquer espera de cache do jsDelivr, ao custo de mais um passo manual (criar a tag).

### 16.5 Por que não EAS Update aqui

EAS Update (OTA do Expo) atualiza o **bundle JS inteiro** (código + o que estiver importado nele), é a ferramenta certa para correções de bug/lógica sem passar pela loja. Para *só conteúdo*, é mais pesado que o necessário e acopla uma mudança de texto a uma nova versão de bundle. O mecanismo desta seção é independente do EAS Update; os dois podem coexistir (EAS Update para código, CDN de `conteudo/` para texto).
