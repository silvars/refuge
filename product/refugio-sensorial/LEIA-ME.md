# Refúgio Sensorial — Pacote de desenvolvimento

Tudo o que é preciso para começar a codificar o MVP, pensado para você e para o agente de IA.

## O que tem aqui

| Caminho | O que é | Para quem |
| --- | --- | --- |
| `01-especificacao-produto.md` | Especificação completa: regras, fluxos, telas, lembretes, segurança, privacidade, visual, som | Você, revisor, agente |
| `02-sdd.md` | Design técnico: stack, arquitetura, banco, algoritmos, áudio, notificações, testes, plano por fases | Agente e você |
| `conteudo/` | Dados em JSON: perguntas e pesos, frases (tela e notificação), mensagens do Porto Seguro, pausas de respiração, climas e cores, etiquetas. Textos em formato multi-locale (pt-BR/en/fr/es); ver especificação seção 16 e SDD seção 15 | App (empacotado) |
| `motor/motor-clima.js` | Regras do clima (mistura, resultado, esmaecimento, sequência, embaralhamento) | Referência para portar |
| `motor/motor-audio.js` | Trilha sintetizada em tempo real (Web Audio), pronta para `react-native-audio-api` | Referência para portar |
| `motor/motor-visual.js` | Forma de pontos e Nebulosa (Canvas) | Referência para portar em Skia |
| `motor/demo-sensorial.html` | Demonstração que roda em qualquer navegador: abra o arquivo, mexa nos controles, ligue o som (use fone) | Você e o agente |
| `audio/*_loop.wav` | Loops de 24 s com emenda contínua (Tempestade, Névoa, Clareira) e o "plim" do teste de fone | App (opção por loops) |
| `audio/gerar_loops.py` | Script que regenera os loops (Python, numpy, scipy) | Ajustes de som |
| `prototipo/prototipo-jornada.dc.html` | Jornada completa do protótipo navegável (formato de template próprio; ver SDD, seção 14) | Referência de comportamento |

## Por onde começar

1. Leia a especificação (seções 1 a 6) para ter a experiência inteira na cabeça.
2. Abra `motor/demo-sensorial.html` com fone para sentir cor, som e forma.
3. Entregue ao agente este pacote inteiro com a instrução: *"Leia LEIA-ME.md e siga a seção 14 do 02-sdd.md. Comece pela Fase 0."*

## Pendências antes de lançar

- Revisor de saúde mental (em aberto).
- Preencher os Salmos com o texto da Bíblia Livre (pt-BR) e das versões equivalentes de domínio público em en/fr/es, e completar a meta de frases — ver especificação, seção 16.
- Traduzir todo `conteudo/*.json` para en/fr/es (campos `texto` hoje com `null` nesses idiomas; ver especificação, seção 16 e SDD, seção 15).
- Decidir se os contatos de ajuda (CVV/SAMU) variam por idioma/região (especificação, seção 16.6).
- Validação jurídica do posicionamento (ANVISA) e política de privacidade (nos 4 idiomas).
