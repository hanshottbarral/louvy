# Louvy

Monorepo full-stack para gerenciamento de escala de louvor de igreja, com escalas, setlists, chat em tempo real, notificacoes e upload de audio.

## Estrutura

```text
.
|-- apps
|   |-- backend
|   `-- frontend
|-- packages
|   `-- shared
|-- docker-compose.yml
`-- tsconfig.base.json
```

## Stack

- Frontend: Next.js, React, TypeScript, TailwindCSS, Zustand, Socket.io client
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT, Socket.io
- Infra: Docker, REST + WebSocket, upload de audio com S3 ou fallback local

## Funcionalidades base

- Autenticacao com `register` e `login`
- Controle por role: `ADMIN` e `MUSICIAN`
- CRUD de escalas
- Confirmacao de presenca por membro
- Setlist com ordenacao drag-and-drop
- Chat por escala com texto, audio e indicador de digitacao
- Notificacoes em tempo real
- Upload de audio para S3 ou armazenamento local

## Backend

Principais rotas em `http://localhost:4000/api`:

- `POST /auth/register`
- `POST /auth/login`
- `GET /users`
- `GET /users/:id`
- `POST /schedules`
- `GET /schedules`
- `GET /schedules/:id`
- `PATCH /schedules/:id`
- `PATCH /schedules/:id/confirm`
- `DELETE /schedules/:id`
- `POST /songs`
- `PATCH /songs/schedule/:scheduleId/reorder`
- `DELETE /songs/:id`
- `GET /messages/:scheduleId`
- `POST /messages`
- `GET /notifications`
- `POST /uploads/audio`

Eventos WebSocket em `ws://localhost:4000`:

- `schedule:join`
- `schedule:leave`
- `message:send`
- `message:receive`
- `user:typing`
- `schedule:update`
- `notification:new`

## Prisma

Modelos principais em [schema.prisma](/Users/hanshott/Documents/LOUVY/apps/backend/prisma/schema.prisma):

- `User`
- `Schedule`
- `ScheduleMember`
- `Song`
- `Message`
- `Notification`

## Como rodar localmente

1. Copie `.env.example` para `.env` na raiz.
2. Instale dependencias:

```bash
npm install
```

3. Gere o client Prisma:

```bash
npm run prisma:generate
```

4. Rode a migracao:

```bash
npm run prisma:migrate
```

5. Suba frontend e backend:

```bash
npm run dev
```

## Como rodar com Docker

```bash
docker compose up --build
```

## Arquivos importantes

- Backend principal: [app.module.ts](/Users/hanshott/Documents/LOUVY/apps/backend/src/app.module.ts)
- Auth/JWT: [auth.service.ts](/Users/hanshott/Documents/LOUVY/apps/backend/src/auth/auth.service.ts)
- Escalas: [schedules.service.ts](/Users/hanshott/Documents/LOUVY/apps/backend/src/schedules/schedules.service.ts)
- WebSocket: [realtime.gateway.ts](/Users/hanshott/Documents/LOUVY/apps/backend/src/realtime/realtime.gateway.ts)
- Upload de audio: [storage.service.ts](/Users/hanshott/Documents/LOUVY/apps/backend/src/common/storage/storage.service.ts)
- Frontend shell: [dashboard-shell.tsx](/Users/hanshott/Documents/LOUVY/apps/frontend/src/components/layout/dashboard-shell.tsx)
- Chat com gravacao: [chat-panel.tsx](/Users/hanshott/Documents/LOUVY/apps/frontend/src/components/chat/chat-panel.tsx)
- Setlist drag-and-drop: [setlist-panel.tsx](/Users/hanshott/Documents/LOUVY/apps/frontend/src/components/songs/setlist-panel.tsx)

## Proximos passos recomendados

- Persistir autenticacao no frontend com refresh token
- Conectar a UI mockada ao backend real via `apiFetch`
- Adicionar testes E2E para fluxo de login, criacao de escala e chat
- Evoluir para PWA completa com cache offline e sincronizacao

# louvy
