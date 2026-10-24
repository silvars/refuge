# Refúgio Sensorial — Especificação do Produto (v3)

> **Status:** pronta para desenvolvimento do MVP · **Data:** outubro de 2026 · **Dono:** Rodrigo
> **Documentos irmãos:** `02-sdd.md` (como construir) · `conteudo/*.json` (textos e regras de dados) · `motor/` (referência de som e animação) · `prototipo/` (jornada navegável)

---

## 1. Visão geral

O Refúgio Sensorial é um app de bem-estar emocional que transforma o check-in de humor numa experiência sensorial de cor, som, forma e vibração, e facilita pedir apoio a quem importa.

**O app não diagnostica, não trata e não substitui acompanhamento profissional.**

**Frase de posicionamento** (loja, onboarding, termos):
> "Um espaço para perceber como você está e se aproximar de quem te faz bem. O Refúgio não faz diagnóstico nem substitui ajuda profissional."

**Frase de boas-vindas:** "Um espaço para ser você. Seu refúgio."

### 1.1 Público-alvo (hipótese)

- **Primário:** adultos de 22 a 45 anos, urbanos, com rotina de estresse alto, que acham os apps de saúde mental clínicos ou trabalhosos demais.
- **Secundário:** quem busca conforto espiritual ou filosófico no dia a dia.
- **Fora do escopo:** menores de 18 anos (classificação 18+) e pessoas em crise aguda, que devem ser direcionadas a serviços especializados.

### 1.2 Pilares

| Pilar | O que significa |
| --- | --- |
| Imersão sensorial | Cor, som, forma e vibração respondem ao estado da pessoa, sem tabelas nem gráficos frios. |
| Leveza no registro | Perguntas metafóricas, poucas decisões por tela. Nenhuma coleta passiva. |
| Privacidade por padrão | Dados emocionais ficam só no aparelho, criptografados. Sem conta, sem servidor. |
| Ponte de afeto | Pedir apoio em poucos toques, com mensagem pronta e editável. |
| Segurança primeiro | Ajuda humana imediata a um toque, em qualquer tela. |
| Calmaria | Traços finos, superfícies translúcidas, transições lentas. Nada grita, nada apressa. |

### 1.3 Modelo de negócio

100% gratuito, sem anúncios, sem compras internas e sem conta. Custo fixo limitado às taxas das lojas (Apple Developer Program anual e Google Play taxa única).

---

## 2. Princípios de experiência

1. **Nada aparece de uma vez.** Telas entram com fade e leve subida; perguntas surgem palavra por palavra; opções chegam em sequência.
2. **A cor nunca salta.** Todo estado visual é uma mistura que se move devagar (cerca de 3 segundos).
3. **O som acompanha a cor.** Mesmas proporções, mesmas transições.
4. **Um destaque por tela.** Os botões são de vidro com traço fino; ninguém compete por atenção.
5. **Sem julgamento.** Dias sem registro são "poeira", não "falha". Linguagem que valida, nunca cobra.
6. **Segurança não negocia com estética.** A ajuda é sempre visível e de leitura clara.
7. **Reduzir movimento é respeitado.** Com a configuração do sistema ativa, animações viram fades simples ou ficam estáticas.

---

## 3. Matriz de estados (climas)

O app trabalha com 3 climas. Eles descrevem como a pessoa se percebe, não uma condição clínica. Valores completos em `conteudo/estados.json`.

| Clima | Como a pessoa se sente | Degradê (165°) | Som | Forma na tela principal |
| --- | --- | --- | --- | --- |
| **Tempestade** | Agitação, tensão, sobrecarga | `#16253D → #24395A → #48573D` | Mar ondulando, ruído rosa, binaural 4 Hz (200/204 Hz) baixinho | Ondula forte e rápido, gira mais |
| **Névoa** | Pouca energia, desânimo, tristeza | `#4B3E72 → #7D6699 → #B48EA6` | Vento leve, violão dedilhado em tons maiores (C, Am, F, G) | Lenta, pesada |
| **Clareira** | Equilíbrio, calma, presença | `#F4EDCB → #E1EDCB → #C6DEBA` | Pad calmo, folhas, pássaros esporádicos | Quase parada, só respira |

**Neutro** (antes do primeiro check-in): fundo `#0E0E14`.
**Ajuda:** degradê fixo `#1B1E2E → #262640 → #2E2A45`, que não muda com o clima.

**Texto:** branco `#FCFCFC` sobre Tempestade e Névoa; escuro `#231F20` quando a Clareira passa de 55% da mistura.

**Sobre o binaural:** camada opcional e sutil, sem promessa de efeito terapêutico. Comunicação: "ambiente sonoro para desacelerar", nunca "frequência que reduz ansiedade".

---

## 4. Motor de clima (regras)

Algoritmos detalhados no SDD; referência executável em `motor/motor-clima.js`.

### 4.1 Durante o check-in

- Cada opção tem **pesos** nos 3 climas (ex.: "Cansado, mas tranquilo" = Névoa 0,4 + Clareira 0,6). Ver `conteudo/perguntas.json`.
- A mistura em tempo real é a soma dos pesos das respostas dadas **mais o clima anterior com peso 1,5**, para a cor partir de onde estava.
- A cor do fundo é a composição dos 3 degradês nessa proporção. Respostas contraditórias movem a cor só um pouco.

### 4.2 Ao concluir

- **Clima do check-in:** o estado com maior soma (sem o clima anterior).
- **Desempate:** vence o estado com maior peso na resposta mais recente entre os empatados.
- **Mistura do dia:** porcentagens dos 3 estados (ex.: Névoa 50% · Tempestade 30% · Clareira 20%).
- Depois do check-in, **cor e som do app seguem a mistura**; o nome grande na tela é o clima predominante.

### 4.3 Esmaecimento

- Mais de **12 horas** sem check-in: uma sobreposição cinza (`#3A3A44` a 55%) esmaece a cor aos poucos, o som cai pela metade e a tela principal convida a um novo check-in.
- Ao concluir um novo check-in, cor e som voltam integralmente.

### 4.4 Sequência de dias difíceis

- Contador `sequencia`: soma 1 a cada check-in em Tempestade ou Névoa; zera na Clareira.
- `sequencia ≥ 3` → banner na tela principal sugerindo o Porto Seguro (ver Protocolo de segurança).
- Ao enviar uma mensagem ao Porto Seguro, a sequência zera.

---

## 5. Mapa de telas e jornada

```
Primeira vez:
Boas-vindas → Conteúdo → Fone → Vamos começar? → Check-in (P1–P3) → Pausa → Check-in (P4–P8) → O que mexeu → Resultado → Tela principal

Tela principal:
├── Medir meu clima → Vamos começar? → Check-in → Pausa → … → Resultado → Tela principal
├── Compartilhar com um Porto Seguro → Seletor de contatos → WhatsApp (ou SMS) → Acolhimento → (Respiro) → Tela principal
├── Minha Nebulosa → Memória do dia
└── Ajustes

Em qualquer tela do app: botão Ajuda → Tela de ajuda → Voltar para onde estava
Lembrete na tela bloqueada → Vamos começar? → Check-in
```

A barra superior (voltar à esquerda; Ajustes e Ajuda à direita) aparece em todas as telas do app. Ajustes só aparece na tela principal. Voltar aparece em: conteúdo, fone, vamos começar, check-in, pausa, o que mexeu, Porto Seguro, Nebulosa e Ajustes.

---

## 6. Funcionalidades

### F1. Onboarding

Sem conta, sem coleta externa, em até 60 segundos até o primeiro check-in.

| Tela | Conteúdo | Regras |
| --- | --- | --- |
| **Boas-vindas** | Forma de pontos respirando (seção 8.3). "Um espaço para ser você." / "Seu refúgio." Frase pequena: "O Refúgio não faz diagnóstico nem substitui ajuda profissional." Botão "Vamos desacelerar?" | Fundo neutro. Sem som ainda. |
| **Conteúdo** | "O que te faz bem ler?" Caixas de seleção (checkbox): Neutra (padrão), Espiritual, Filosófica. | Múltipla escolha. Se nenhuma, assume Neutra. O toque em "Continuar" inicia o áudio (exigência dos navegadores; no app, apenas liga o motor). |
| **Fone** | "Coloque fones, se tiver." Dois círculos alternando esquerdo/direito com "plim" alternado. Botões: "Pronto, estou ouvindo" e "Usar sem som". | "Usar sem som" desliga o som (reversível em Ajustes). |
| **Vamos começar?** | Forma de pontos lenta. Frases surgindo em sequência: "Se acomode." (0,4 s) · "Respire fundo." (1,8 s) · "Vamos começar?" (3,2 s). Botão "Começar" aparece em 4,2 s. | Também antecede todo check-in posterior (botão "Medir meu clima" e lembretes). |

**Critérios de aceite**
- [ ] Chega à tela principal sem fone e sem conectar nada
- [ ] Linha de conteúdo alterável depois em Ajustes
- [ ] Onboarding até o primeiro check-in em até 60 s

### F2. Check-in "Medir meu clima"

**8 perguntas metafóricas**, uma por dimensão, 4 opções cada (`conteudo/perguntas.json`):

| # | Dimensão | Pergunta |
| --- | --- | --- |
| 1 | Mente | Se sua mente fosse um elemento da natureza agora, ela seria… |
| 2 | Corpo | Como o seu corpo está agora? |
| 3 | Sono | E a sua última noite, como foi? |
| — | *Pausa de respiração (F3)* | |
| 4 | Pensamentos | Seus pensamentos hoje parecem… |
| 5 | Preocupações | E as preocupações, como estão hoje? |
| 6 | Energia | Se sua energia fosse a bateria do celular… |
| 7 | Pessoas | Como você se sente em relação às pessoas hoje? |
| 8 | Prazer | Hoje, as coisas de que você gosta… |

**Regras**
- **Ordem das dimensões fixa.** **Ordem das opções embaralhada a cada check-in**, estável dentro do mesmo check-in (voltar uma pergunta mostra a mesma ordem).
- Cada pergunta é "foto do momento" (agora/hoje), não uma janela de semanas como DASS-21 ou PHQ-9. As perguntas se inspiram nas dimensões desses instrumentos, sem validade clínica, e o app não afirma o contrário.
- **Não há pergunta sobre pensamentos de morte ou autolesão** (ver Protocolo de segurança).
- Topo: linha fina de progresso (96 px, 2 px de altura) + rótulo "Dimensão · n de 8".
- Opções em **linhas leves** separadas por um fio; a escolhida ganha brilho suave e contorno fino.
- Botão voltar: volta uma pergunta; na primeira, sai do check-in.

**Transição entre perguntas** (≈ 3 s até a próxima estar completa):

| Tempo | O que acontece |
| --- | --- |
| 0 – 0,48 s | A opção escolhida brilha e fica; as outras somem (380 ms). Vibração curta (F6). |
| 0,48 – 1,05 s | A pergunta inteira sobe 14 px e se dissolve (450 ms). A cor do fundo já está mudando. |
| 1,05 s | Troca para a próxima pergunta, tela só com a cor. |
| + 0,25 s | Palavras surgem uma a uma: cada palavra de desfocada (blur 5 px, +6 px) para nítida em 900 ms, intervalo de 90 ms entre palavras. |
| após a última palavra + 0,45 s | Opções entram uma a uma (800 ms cada, intervalo de 170 ms). |

Com "reduzir movimento": sem animação, troca direta.

**Critérios de aceite**
- [ ] Ordem das opções muda entre check-ins e não muda dentro do mesmo
- [ ] Resultado salvo localmente com data, hora, respostas, mistura e etiquetas
- [ ] Voltar uma pergunta preserva a resposta anterior marcada
- [ ] Toques durante a transição são ignorados (sem resposta dupla)

### F3. Pausa de respiração

Aparece **uma vez por check-in, depois da pergunta 3**, e também como "respiro" opcional após o Porto Seguro.

**O tipo é definido pelo estado, não pela pessoa:** clima predominante na mistura até a P3 (incluindo o clima anterior), ou clima do dia no respiro pós-Porto Seguro. Não há botões para trocar o tipo nem alternativas.

| Clima | Pausa | Ritmo | Título | Frase de apoio |
| --- | --- | --- | --- | --- |
| Tempestade | Desacelerar | Inspira 4 s, solta 7 s | Vamos desacelerar juntos. | Soltar o ar mais devagar do que puxa pode ajudar a desacelerar. Siga a esfera. |
| Névoa | Acolher | 5 s e 5 s | Um respiro para se acolher. | Se quiser, coloque a mão no peito e respire ali, no ritmo da esfera. |
| Clareira | Saborear | 4 s e 4 s | Guarde este momento. | Pense em uma coisa boa de hoje e fique com ela por três respirações. |

- A **forma de pontos** cresce na inspiração (escala 0,62 → 1,15) e encolhe na expiração, com o ritmo do tipo. Rótulos "Inspire…" / "Solte…" sincronizados.
- Rótulo superior: "Uma pausa no meio do caminho" (check-in) ou "Um respiro só para você" (pós-Porto Seguro).
- Botão "Continuar" a qualquer momento.
- **Fase futura:** pulso de vibração no início de cada inspiração e expiração (F6).

### F4. O que mexeu com você (etiquetas)

Tela opcional após a P8: "Quer dar nome ao que mais mexeu com você hoje?" Chips de múltipla escolha: Trabalho, Estudos, Família, Relacionamento, Saúde, Sono, Dinheiro, Nada em especial (exclusiva). Botões "Ver meu clima" e "Pular". Salvo só no aparelho; aparece no resultado e na Nebulosa.

### F5. Resultado

- "Seu clima agora" + nome do clima (peso fino, 48 px) + descrição.
- Linha da mistura quando houver mais de um estado: "Hoje teve um pouco de tudo: Névoa 50% · Tempestade 30% · Clareira 20%".
- Linha das etiquetas: "O que mexeu com você: Trabalho, Sono".
- Card de vidro com a frase do dia da linha de conteúdo escolhida (rotação entre linhas selecionadas a cada check-in).
- Vibração dupla suave ao entrar (F6).
- Botão "Ir para o meu refúgio".

### F6. Vibração suave

- **Ao escolher uma resposta:** toque curto e leve.
- **Ao revelar o clima:** toque duplo suave.
- **Ajustes:** "Vibração suave", ligada por padrão; ao religar, toque de amostra.
- Respeita as configurações de vibração do sistema.
- **Fase futura:** pulso na respiração (Core Haptics no iOS).

### F7. Tela principal

De cima para baixo:
1. "Seu clima agora" + nome do clima (40 px, peso fino).
2. Card de vidro com a frase do dia.
3. **Banner de esmaecimento** (se > 12 h): "Seu último check-in foi há mais de 12 horas. Como está o clima aí dentro agora?" + "Fazer um novo check-in".
4. **Banner de sequência** (se `sequencia ≥ 3`): "Os últimos dias têm pesado. Que tal chamar alguém que te faz bem?" + "Compartilhar com um Porto Seguro".
5. **Forma de pontos** ocupando o espaço livre, com comportamento do clima (seção 3).
6. Três botões de vidro: "Medir meu clima", "Compartilhar com um Porto Seguro", "Minha Nebulosa".

O app **não exibe** indicação de música tocando.

### F8. Compartilhar com um Porto Seguro

Fluxo simplificado: **a mensagem nasce do clima e a pessoa pode editar**.

1. Título "Compartilhar com um Porto Seguro" + "Montamos uma mensagem a partir do seu clima. Se quiser, mude do seu jeito."
2. Card com faixa no degradê do clima ("Seu clima agora · Névoa") e **caixa de texto editável** com a mensagem (`conteudo/porto-seguro.json`, 3 por clima).
3. "Sugerir outra mensagem" troca pela próxima do mesmo clima (descarta edição).
4. "Escolher um Porto Seguro" abre o **seletor nativo de contatos**, sem pedir permissão de agenda.
5. Ao escolher, se o texto não foi editado, "Oi!" vira "Oi, <primeiro nome>!".
6. Número normalizado para E.164 (sem DDI → país do aparelho, BR = +55).
7. Abre `https://wa.me/<numero>?text=<mensagem codificada>`. Sem WhatsApp, **fallback automático para SMS** (`sms:`) com o mesmo texto.
8. Ao voltar ao app: tela de **acolhimento** — "Você deu um passo importante." / "<Nome> vai ver sua mensagem quando puder. A resposta pode demorar um pouco, e tudo bem." Botões "Respirar um pouco enquanto isso" (F3, modo respiro) e "Voltar ao meu refúgio".
9. O dia fica marcado como "compartilhou com um Porto Seguro" (sem guardar o contato) e a sequência zera.

**Critérios de aceite**
- [ ] Nenhuma permissão de contatos solicitada (confirmar comportamento do seletor no Android)
- [ ] Números com e sem +55, DDD, 0 inicial e 9º dígito normalizados corretamente
- [ ] Fallback para SMS quando o WhatsApp não está instalado
- [ ] O app não guarda o contato escolhido

### F9. Minha Nebulosa

Histórico afetivo do mês, sem gráficos.

- **Céu:** cada dia é uma **estrela** numa espiral (dia 1 no centro até hoje), ligadas por um fio de luz bem fraco (8% de opacidade). Ao abrir, as estrelas acendem uma a uma (40 ms entre elas).
- **Cor da estrela:** mistura do dia (cores de estrela: Tempestade `#6096D6`, Névoa `#B28CE4`, Clareira `#F6CE60`).
- **Brilho:** tamanho proporcional ao número de check-ins do dia. **Hoje** pulsa e tem o rótulo "hoje".
- **Névoa da semana:** por trás de cada semana do calendário, uma nuvem radial com a cor média daquela semana.
- **Dias sem registro:** poeira bem fraca. Fundo com pontinhos cintilando.
- **Toque numa estrela** (raio de 26 px) abre a **memória do dia**: data + quantidade de check-ins; nome do clima; barra e texto da mistura; "O que mexeu com você"; frase do dia; "Você compartilhou com um Porto Seguro neste dia" quando houver.
- **Resumo da semana**, neutro: "Nesta semana: Clareira em 2 dias · Névoa em 3 dias · Tempestade em 1 dia."
- Legenda das 3 cores.
- **Acessibilidade:** o canvas tem descrição textual (resumo da semana). Fase seguinte: visão em lista para leitores de tela e navegação entre meses e semana/mês.

**Critérios de aceite**
- [ ] Legível sem cor (nome do clima no toque e no leitor de tela)
- [ ] Usuário pode apagar um dia ou todo o histórico (em Ajustes)

### F10. Ajustes

Card de vidro com interruptores:
- Linha neutra · Linha espiritual · Linha filosófica
- Som ambiente
- Vibração suave
- Lembretes de recalibração
- Mensagens de apoio (F12)
- Bloquear o app (biometria ou PIN do aparelho)

Ações: "Apagar todos os meus dados" (sem confirmação por e-mail; com uma confirmação no app). Texto: "Seus dados ficam só neste aparelho. Sem conta, sem servidor." Tela "Sobre": créditos de conteúdo (Bíblia Livre), versão, política de privacidade.

### F11. Lembretes de recalibração

- Após check-in em Tempestade ou Névoa: lembrete local entre **4 e 12 horas** depois.
- **Horário de silêncio** padrão 22h–8h (lembrete cai para depois das 8h).
- **No máximo 2 notificações por dia somando lembretes e mensagens de apoio.**
- Texto **neutro**, que não revela estado na tela bloqueada: "Um tempo se passou. Quer fazer um novo check-in?"
- Toque abre "Vamos começar?" → check-in.

### F12. Mensagens de apoio

Notificações locais com frases de acolhimento escolhidas pelo **último clima** (`conteudo/frases.json`, `uso: "notificacao"`).

- **Opt-in** (desligadas por padrão), no máximo **1 por dia**, dentro do limite de 2 notificações/dia, respeitando o horário de silêncio.
- **Tom por clima:** Tempestade = desacelerar e dar chão; Névoa = validar e acolher; Clareira = celebrar e guardar. **Nunca** frases de ordem ("Anime-se!").
- **Privacidade:** texto universal, que não revela o estado ("Você está em Névoa" é proibido).
- **Repetição:** respeitar `nao_repetir_dias` (padrão 14) e `momento` (manhã/noite).
- **Não substitui o escalonamento:** com sequência alta, o app continua sugerindo Porto Seguro e ajuda profissional.
- Toque abre a tela principal.
- Todas as frases passam pela revisão do profissional antes de ativar.

### F13. Ajuda imediata

Ver seção 9 (Protocolo de segurança).

---

## 7. Som

Referência executável: `motor/motor-audio.js`. Loops renderizados: `audio/*.wav`.

### 7.1 Camadas

| Camada | Elementos |
| --- | --- |
| Tempestade | Ruído rosa em passa-baixas (650 Hz ± 380 Hz) com volume ondulando a ~0,085 Hz (ondas); binaural 200 Hz (esquerda) / 204 Hz (direita) a volume 0,045 |
| Névoa | Ruído em passa-banda móvel (520 Hz ± 260 Hz) como vento; violão Karplus-Strong em arpejo C–Am–F–G, padrão 0-1-2-3-2-1, uma nota a cada ~1 s, pan suave |
| Clareira | Ruído agudo (> 2,8 kHz) como folhas; pad de 4 senoides (F3, A3, C4, F4) com leve desafinação; grupos de 2–4 pios de pássaro a cada 2,5–6,5 s, posição aleatória no estéreo |
| Teste de fone | "Plim" de 523 Hz alternando esquerda e direita a cada 1,2 s |

### 7.2 Mistura e volume

- Volume de cada camada = proporção do clima na mistura (Tempestade × 0,9), transição com constante de tempo de ~1,2 s.
- Sem clima ainda (onboarding): base neutra = Névoa 35% + Clareira 65%.
- **Volume geral por tela:** boas-vindas e conteúdo = mudo; tela de ajuda = 0,12; fora do app (tela bloqueada, seletor, WhatsApp) = 0,25; demais = 0,85; esmaecido = metade.
- "Usar sem som" e o interruptor de Ajustes silenciam tudo.

### 7.3 No app

- Opção A (recomendada para o MVP): **síntese ao vivo** portando `motor-audio.js` para `react-native-audio-api`.
- Opção B: **loops gravados** (`audio/*_loop.wav`, 24 s, 44,1 kHz, estéreo, emenda contínua) tocados em paralelo com crossfade de volume. Mais simples, menos variação.
- Produção futura: substituir por trilhas produzidas mantendo o mesmo esquema de camadas.

---

## 8. Linguagem visual

### 8.1 Tokens

| Token | Escuro (Tempestade/Névoa) | Claro (Clareira ≥ 55%) |
| --- | --- | --- |
| Tinta do texto | `#FCFCFC` | `#231F20` |
| Texto secundário | `rgba(252,252,252,0.86)` | `#3E3A36` |
| Vidro | `rgba(252,252,252,0.10)` | `rgba(255,255,255,0.38)` |
| Vidro forte (botão principal, opção escolhida) | `rgba(252,252,252,0.18)` | `rgba(255,255,255,0.55)` |
| Vidro interno (caixa de texto) | `rgba(0,0,0,0.14)` | `rgba(255,255,255,0.5)` |
| Fio (bordas, separadores) | `rgba(252,252,252,0.36)` | `rgba(35,31,32,0.22)` |
| Desfoque do vidro | 14 px | 14 px |

- **Botões:** pílula (raio 999), contorno de 1 px, altura 48–56 px (alvo mínimo de 44 px).
- **Cards:** raio 16–24 px, vidro + fio.
- **Ajuda (botão do topo):** pílula de vidro com ponto vermelho `#E71A3B` de 8 px + "Ajuda".
- **Sem sombras pesadas.** Brilhos apenas na forma de pontos e nas estrelas.

### 8.2 Tipografia

- **Títulos:** Urbanist. Nomes de clima 40–48 px peso 300; títulos de tela 26–32 px peso 300; botões e destaques 17–20 px peso 500; letter-spacing 0,2 px.
- **Texto:** Roboto 15–16 px peso 400, entrelinha 1,45–1,5. Rótulos 13 px peso 400.
- Peso fino nunca em texto pequeno sobre degradê.

### 8.3 Forma de pontos

Forma orgânica de ~1.400 pontos de luz (900 em telas menores) sobre esfera de Fibonacci, deformada por 3 ondas, girando em 3D e respirando. Pontos da frente mais brilhantes; borda com brilho. Referência: `motor/motor-visual.js`.

| Onde | Comportamento |
| --- | --- |
| Boas-vindas | Amplitude 1, velocidade 1, rotação 0,22, respira em 6 s (±5%) |
| Vamos começar? | Amplitude 0,6, velocidade 0,6, respira em 6 s |
| Tela principal | Parâmetros do clima (estados.json), respira em 6 s (±4%) |
| Pausa | Ritmo do tipo de pausa, escala 0,62 → 1,15 |

Pontos brancos sobre fundo escuro; escuros (`#231F20`) quando a Clareira domina. Mudanças de cor e agitação interpoladas por quadro (sem trocas bruscas).

### 8.4 Movimento

| Elemento | Duração / curva |
| --- | --- |
| Degradê entre climas | 2,8 s, `cubic-bezier(0.45,0,0.25,1)` |
| Cor do texto | 1,6 s |
| Entrada de tela | 0,7 s, fade + subida de 8 px, `cubic-bezier(0.25,0.6,0.3,1)` |
| Perguntas | ver F2 |
| Frases de "Vamos começar?" | 1,4 s cada, atrasos 0,4 / 1,8 / 3,2 / 4,2 s |

---

## 9. Protocolo de segurança e crise

**Requisito de lançamento, não melhoria futura.**

### 9.1 Botão Ajuda

- Fixo no topo de **todas as telas do app**, inclusive onboarding, check-in e pausa.
- Abre a tela de ajuda, com fundo fixo calmo e alto contraste:
  - "Você não precisa passar por isso sem apoio." / "Fale agora com alguém preparado para te ouvir."
  - **Ligar para o CVV · 188** — "Apoio emocional, 24 horas, gratuito" (destaque discreto)
  - **Ligar para o SAMU · 192** — "Emergência médica"
  - **Compartilhar com um Porto Seguro** — "Mensagem pronta para alguém de confiança"
  - Rodapé: "Esta tela funciona sem internet e aparece com um toque em qualquer lugar do app."
- Ligações via discador nativo (`tel:188`, `tel:192`), funcionam offline.
- Botões com 76 px de altura. Volume da trilha quase zero nesta tela.
- O texto **não promete sigilo** nem descreve o que acontece na ligação.

### 9.2 Escalonamento

| Situação | Resposta |
| --- | --- |
| 1 registro em Tempestade/Névoa | Frase acolhedora + lembrete de recalibração em 4–12 h |
| 3 registros seguidos | Banner de Porto Seguro na tela principal |
| 7 dias com predomínio de Tempestade/Névoa | Mensagem sugerindo conversar com um profissional, com caminhos (CVV, CAPS, UBS) |
| Toque em Ajuda | Tela de ajuda imediata, sem perguntas |

### 9.3 O que o app não faz

- Não pergunta sobre pensamentos de morte ou autolesão.
- Não mostra conteúdo que romantize sofrimento.
- Não envia "mais motivação" como resposta a sofrimento persistente.

### 9.4 Antes de lançar

- [ ] Revisão por profissional de saúde mental **(pendente: Rodrigo vai procurar; opção: clínica-escola de psicologia)** em duas etapas: conteúdo antes de codar; app no beta
- [ ] Validar o fluxo de ajuda com 5 usuários reais
- [ ] Conferir números e serviços vigentes na data de lançamento

---

## 10. Conteúdo

- **Linhas:** Neutra (padrão, frases autorais), Espiritual (Salmos), Filosófica (estoicismo). A pessoa escolhe; rotação entre as linhas escolhidas.
- **Bíblia:** **Bíblia Livre (BLIVRE)**, licença Creative Commons Atribuição, crédito obrigatório com data da versão na tela Sobre (texto em `frases.json → credito_biblia_livre`). Confirmar a variante da licença no site oficial antes de publicar. NVI e ARA ficam de fora (copyright).
- **Filosofia:** autores clássicos em **tradução própria** (traduções modernas têm direitos).
- **Meta de lançamento:** ≥ 30 frases de tela por clima em cada linha ativa; ≥ 15 frases de notificação por clima.
- Frases sensíveis (ex.: Salmos 23:4, que fala de morte) só entram após revisão.
- Campos de cada frase em `conteudo/frases.json`; o campo `ativo` permite desligar sem nova versão.

---

## 11. Privacidade e LGPD

Dados de humor são dados pessoais sensíveis (LGPD, art. 11). Estratégia: **nenhum dado emocional sai do aparelho**.

- Sem conta, sem servidor para dados emocionais.
- Contatos: apenas o escolhido no seletor nativo, no momento do uso; nada lido em lote nem guardado.
- Banco local criptografado; chave no Keychain/Keystore.
- Histórico **fora do backup automático** em nuvem. Exportar/importar só por ação explícita, em arquivo criptografado (fase seguinte).
- Bloqueio opcional por biometria/PIN.
- Notificações sempre neutras na tela bloqueada.
- "Apagar tudo" remove todos os dados.
- Analytics: apenas opt-in, desligado por padrão, eventos sem conteúdo emocional ("check-in concluído", nunca "check-in em Tempestade"). Crash reports sem estado nem textos.
- **Lojas:** política de privacidade em português simples; declaração de app de saúde (Google Play) e rótulos de privacidade (App Store); classificação 18+.
- **Regulação:** validar com advogado que o posicionamento de bem-estar mantém o app fora do enquadramento de software como dispositivo médico (ANVISA, RDC 657/2022).

---

## 12. Acessibilidade

- Estado nunca comunicado só por cor: sempre nome do clima (texto e leitor de tela).
- Contraste AA nos textos; bordas e vidro podem ser sutis, textos não.
- Alvos de toque ≥ 44 px.
- Respeita "reduzir movimento", tamanho de fonte do sistema e leitor de tela (rótulos em ícones, `role=checkbox` nas linhas de conteúdo, `aria-label` com a pergunta inteira na entrada palavra por palavra).
- App funciona integralmente sem som e sem vibração.

---

## 13. Métricas de sucesso (metas iniciais)

| Métrica | Meta |
| --- | --- |
| Concluem o onboarding | 80% |
| 2+ check-ins na 1ª semana | 40% |
| Retenção na semana 4 | 20% |
| Enviam ≥ 1 mensagem ao Porto Seguro no 1º mês | 15% |
| Nota na loja | ≥ 4,5 |

Medidas via analytics opt-in (sem conteúdo) e entrevistas no beta. Tempo de tela não é meta.

---

## 14. Decisões e pendências

| Tema | Decisão |
| --- | --- |
| Posicionamento | Bem-estar e autopercepção; sem diagnóstico |
| Modelo de negócio | 100% gratuito, sem anúncios |
| Revisor de saúde mental | **Pendente** — Rodrigo vai procurar; revisão em duas etapas |
| Bíblia | Bíblia Livre (BLIVRE), Creative Commons |
| Diagnóstico passivo (redes sociais, tempo de tela) | Fora do produto |
| Tipo de pausa | Definido pelo estado, sem escolha do usuário |
| Porto Seguro | Mensagem pelo clima, editável, WhatsApp com fallback SMS |
| Plataforma | Multiplataforma (React Native + Expo); ver SDD |
| Idiomas | pt-BR, en, fr, es, todos completos no MVP (ver seção 16) |
| Números de emergência (CVV/SAMU) nos idiomas en/fr/es | **Pendente** — hoje são só brasileiros; decidir se mantém fixo ou adapta por idioma/região |
| Tradução do conteúdo (perguntas, frases, mensagens) para en/fr/es | **Pendente** — tratada como entrega separada da reestruturação técnica |

---

## 15. Roadmap pós-MVP

1. Check-in rápido (3–4 perguntas) para recalibrações; completo (8) no primeiro do dia.
2. Variações de metáfora (2–3 por dimensão), alternando entre check-ins.
3. Pulso de vibração sincronizado à respiração.
4. Nebulosa: navegação entre meses, visão semana/mês, lista acessível.
5. Widget e atalho de check-in.
6. Integração opcional com Apple Health / Health Connect (sono e passos, só no aparelho).
7. Exportação criptografada do histórico.
8. Trilhas sonoras produzidas.

---

## 16. Idiomas e localização

**Idiomas do MVP:** português (pt-BR, idioma de origem do produto), inglês (en), francês (fr) e espanhol (es) — os 4 completos já no lançamento, cobrindo interface e conteúdo dinâmico.

### 16.1 Seleção de idioma

- **Detecção automática** pelo idioma do aparelho no primeiro uso. Se o idioma do aparelho não estiver entre os 4 suportados, o app abre em **pt-BR** (idioma de origem).
- **Troca manual** disponível em Ajustes, a qualquer momento, com efeito imediato (sem precisar reiniciar o app). A escolha manual tem prioridade sobre a detecção automática em usos futuros.
- A troca de idioma não afeta dados já salvos (histórico, etiquetas); textos de telas passadas (ex. Nebulosa) são exibidos no idioma atual, mesmo que tenham sido registrados em outro.

### 16.2 O que é traduzido

- **Interface:** todos os textos de tela, botões, rótulos de acessibilidade (`aria-label`, leitor de tela) e notificações.
- **Conteúdo dinâmico** (`conteudo/*.json`): perguntas e opções do check-in, nomes/descrições dos climas, frases das 3 linhas (tela e notificação), mensagens do Porto Seguro, rótulos e frases de apoio da pausa de respiração, etiquetas de "o que mexeu com você".
- **O que não muda por idioma:** pesos das opções, cores, tempos de animação/respiração, regras do motor de clima — são dados numéricos, não texto.

### 16.3 Linha espiritual por idioma

Cada idioma usa uma versão bíblica de **domínio público ou licença aberta equivalente**, mantendo o mesmo princípio da linha neutra/filosófica (crédito obrigatório na tela Sobre, seção 10):

| Idioma | Versão proposta | Licença |
| --- | --- | --- |
| pt-BR | Bíblia Livre (BLIVRE) | Creative Commons Atribuição |
| en | World English Bible (WEB) | Domínio público |
| fr | Louis Segond (1910) | Domínio público |
| es | Reina-Valera Antigua (1909) | Domínio público |

Confirmar a licença exata de cada versão no site oficial antes de publicar (mesma ressalva já feita para a BLIVRE, seção 10). Os números dos versículos (Salmos) são os mesmos entre idiomas; o texto de cada frase muda.

### 16.4 Linha filosófica por idioma

Para inglês, francês e espanhol, usar **traduções clássicas já em domínio público** (ex. Internet Classics Archive, Project Gutenberg) dos mesmos textos de Epicteto e Sêneca escolhidos em português, citando tradutor e fonte em `origem`/`traducao_edicao`. A tradução própria (usada em pt-BR) não se aplica aos demais idiomas.

### 16.5 Mensagens do Porto Seguro por idioma

Adaptadas culturalmente, não traduzidas ao pé da letra (tom equivalente ao original: informal, afetivo, breve). Mesma estrutura de 3 mensagens por clima em cada idioma.

### 16.6 Ajuda imediata (seção 9) e idioma

Os contatos de ajuda (CVV · 188, SAMU · 192) são serviços **brasileiros**. No MVP, a tela de Ajuda mantém esses mesmos contatos independentemente do idioma escolhido (o idioma é tratado como preferência de leitura, não como localização geográfica). **Pendência em aberto:** decidir se, numa fase futura, os contatos de ajuda devem variar por idioma/região (ver seção 14).

### 16.7 Meta de conteúdo por idioma

A meta de lançamento da seção 10 (**≥ 30 frases de tela por clima em cada linha ativa; ≥ 15 frases de notificação por clima**) vale **por idioma**, não apenas em pt-BR. Frases sem tradução completa ficam marcadas como pendentes e não entram na rotação daquele idioma até serem revisadas (ver SDD, seção sobre internacionalização).

### 16.8 Acessibilidade e idioma

- `lang` do documento/app muda com o idioma selecionado (leitores de tela anunciam no idioma certo).
- Pluralização e formatação de data/hora seguem convenções de cada idioma (ex. "3 dias" vs "3 days" vs "3 jours" vs "3 días").

---

## 16. Riscos

| Risco | Mitigação |
| --- | --- |
| Pessoa em crise usa o app no lugar de ajuda real | Ajuda fixa, escalonamento, revisão profissional |
| Enquadramento como dispositivo médico | Posicionamento de bem-estar + validação jurídica |
| Reprovação nas lojas | Declarações de saúde, privacidade, 18+ |
| Áudio instável no celular (segundo plano, interrupções) | Prova de conceito do som antes das telas; fallback para loops ou módulo nativo |
| Desempenho da forma de pontos em aparelhos simples | 900 pontos em telas pequenas; reduzir para 600 se < 50 fps |
| Baixa retenção após a novidade | Lembretes gentis, Nebulosa, mensagens de apoio, conteúdo novo por OTA |
| Direitos autorais das frases | Licença registrada por item; traduções próprias |
