# Refúgio Sensorial

App de bem-estar emocional (React Native + Expo). O app não diagnostica, não
trata e não substitui acompanhamento profissional.

Toda a documentação do produto — especificação, design técnico (SDD), conteúdo
e protótipo — vive em [`product/refugio-sensorial/`](product/refugio-sensorial/LEIA-ME.md).
Comece por ali.

## Desenvolvimento

```bash
nvm use                 # Node 22 (ver .nvmrc)
npm install
npx expo start
```

- Instalar pacotes sempre via `npx expo install <pacote>`, nunca `npm install` direto.
- Rodar `npm run lint` e `npm run typecheck` antes de qualquer commit.
- Rotas ficam em `src/app/` (expo-router); código não-rota fica fora dessa pasta.
- `ios/`/`android/` não existem no repo — são gerados sob demanda (Continuous Native Generation) a partir de `app.json`. Nunca editar à mão.

Guia completo de arquitetura: [`product/refugio-sensorial/02-sdd.md`](product/refugio-sensorial/02-sdd.md).

