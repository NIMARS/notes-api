# Notes API

## Русский

## 🌍 Languages

[Русский](#русский) | [English](#english)

## Notes API RU

Fastify + TypeScript + Prisma сервис для заметок с фильтрами по тегам, курсорной пагинацией и удобной документацией Swagger.

## ✨ Возможности

* **CRUD заметок**
* **Фильтрация по тегам** (`tagsAny`, `tagsAll`) на PostgreSQL с **GIN**-индексом по `jsonb`
* **Курсорная пагинация** по `(createdAt DESC, id DESC)`
* **Валидация Zod** с автогенерацией **JSON Schema** для Swagger
* **Централизованный error-handler** в едином формате `{ error, message, reqId?, details? }`
* **Логирование Pino**
* **Swagger UI** на `/docs`
* **Docker Compose**: `api` + `postgres`
* **Jest + Supertest**: 20+ e2e-тестов

## 🧰 Технологии

* **Node.js ≥ 20**, **TypeScript 5**
* **Fastify 5**, **@fastify/swagger**, **@fastify/swagger-ui**
* **fastify-type-provider-zod 6** + **Zod 4**
* **Prisma 5**, **PostgreSQL**
* **Pino** / **pino-pretty**
* **Jest 29**, **Supertest**

## 📦 Скрипты

Из `package.json`:

```bash
# разработка / запуск
npm run dev         # tsx watch src/server.ts
npm start           # tsx src/server.ts

# сборка
npm run build       # tsc -p tsconfig.json

# БД и Prisma
npm run generate    # prisma generate
npm run migrate:dev # prisma migrate dev --name init_notes
npm run migrate:deploy
npm run seed        # tsx prisma/seed.ts

# тесты и линт
npm test
npm run test:watch
npm run lint

# Docker
npm run docker:up
npm run docker:down
```

## 🗂 Структура проекта

```bash
.
├── prisma
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/20250930063958_id_uuid_tags_jsonb/migration.sql
├── src
│   ├── app.ts            # сборка Fastify (валидаторы, swagger, маршруты, error-handler)
│   ├── server.ts         # запуск HTTP-сервера
│   ├── bootstrap/env.ts  # загрузка .env
│   ├── db/prisma.ts      # инициализация PrismaClient
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── handler.ts    # централизованный error-handler
│   ├── logger/index.ts   # pino/pino-pretty
│   ├── routes/
│   │   ├── health.ts     # GET /health
│   │   └── notes.routes.ts
│   └── utils/cursor.ts   # encode/decode курсора
├── tests
│   ├── notes.test.ts
│   └── setup.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## 🛠️ Подготовка окружения

1. Скопируй пример переменных среды:

    ```bash
    cp .env.example .env
    ```

2. Укажи строку подключения к БД (`DATABASE_URL`), напр.:

    ```bash
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notes?schema=public
    ```

3. Применяй Prisma:

    ```bash
    npm run generate
    npm run migrate:dev
    npm run seed         # по желанию
    ```

## 🐳 Запуск в Docker

```bash
npm run docker:up
# поднимет postgres и api, применит миграции и запустит сервер
```

API будет на `http://localhost:3000`, Swagger — на `http://localhost:3000/docs`.

Остановить и удалить данные:

```bash
npm run docker:down
```

## 🧪 Тесты

```bash
npm test
# или
npm run test:watch
```

Тесты поднимают приложение в памяти и работают против реальной Postgres (рекомендуется отдельная БД/схема для тестов).

## 🗄️ Модель данных (Prisma, PostgreSQL)

```prisma
model Note {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  content   String
  tags      Json     @db.JsonB
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([createdAt(sort: Desc), id(sort: Desc)], map: "idx_notes_createdAt_id_desc") // курсор
  @@index([tags], type: Gin, map: "idx_note_tags_gin")                                  // фильтры по jsonb
}
```

* По `tags` создан **GIN**-индекс (jsonb).
* Пагинация по `(createdAt DESC, id DESC)`.

## 🔎 Пагинация и фильтры

### Курсорная пагинация

* Запрос первой страницы: `GET /notes?limit=20`
* Ответ:

```json
{
  "items": [ /* ... */ ],
  "nextCursor": "base64-строка-курcора-или-null"
}
```

* Вторая страница: `GET /notes?limit=20&cursor=<nextCursor>`

### Фильтр по тегам

* Любая из меток: `GET /notes?tagsAny=a&tagsAny=b`
* Все метки: `GET /notes?tagsAll=a&tagsAll=b`
* Также поддерживается CSV: `tagsAny=a,b` / `tagsAll=a,b`.

## 🧾 API (кратко)

### Health

`GET /health` → `200`

```json
{ "status": "ok" }
```

### Notes

* `GET /notes` — список + пагинация + фильтры

  * query: `limit` (1..100, по умолчанию 20), `cursor`, `tagsAny[]`, `tagsAll[]`
  * ответ: `{ items: Note[], nextCursor: string|null }`

* `POST /notes` — создать

```json
// request
{ "title": "Title", "content": "Text", "tags": ["a", "b"] }

// response 201
{
  "id":"uuid",
  "title":"Title",
  "content":"Text",
  "tags":["a","b"],
  "createdAt":"2025-09-30T06:12:34.567Z",
  "updatedAt":"2025-09-30T06:12:34.567Z"
}
```

* `GET /notes/:id` — получить по id
* `PATCH /notes/:id` — частичное обновление (`title?`, `content?`, `tags?`)
* `DELETE /notes/:id` — удалить

### Ошибки (единый формат)

Всегда JSON вида:

```json
{ "error": "ValidationError", "message": "body/title Invalid input: expected string, received undefined", "reqId": "req-1" }
```

Коды:

* `400` — валидация (Zod/Ajv)
* `404` — не найдено (Prisma P2025)
* `409` — конфликт уникальности (Prisma P2002)
* `500` — прочее

## 📘 Swagger

Документация доступна на **`/docs`** (генерируется из Zod-схем через `fastify-type-provider-zod` → **JSON Schema**).

## 📝 Логи

* Dev: красиво через `pino-pretty`
* Prod: структурированный JSON в stdout
  Логи запросов/ответов, `reqId`, время обработки, ошибки.

## 🤝 Контрибуции

1. Форкни репозиторий
2. Создай ветку: `feat/my-feature`
3. Убедись, что:

   * `npm run lint` — без ошибок
   * `npm test` — все зелёные
4. Открой PR

## 📄 Лицензия

ISC (см. `package.json`).

---

### Быстрый старт (TL;DR)

```bash
cp .env.example .env
npm i
npm run generate
npm run migrate:dev
npm run dev
# Swagger: http://localhost:3000/docs
```

## English

## 🌍  Languages

[Русский](#русский) | [English](#english)

## Notes API ENG

Fastify + TypeScript + Prisma service for notes with tag filters, cursor pagination, and handy Swagger documentation.

## ✨ Features

* **CRUD for notes**
* **Tag filtering** (`tagsAny`, `tagsAll`) on PostgreSQL with **GIN** index on `jsonb`
* **Cursor pagination** by `(createdAt DESC, id DESC)`
* **Zod validation** with auto-generated **JSON Schema** for Swagger
* **Centralized error handler** with a unified `{ error, message, reqId?, details? }` shape
* **Pino logging**
* **Swagger UI** at `/docs`
* **Docker Compose**: `api` + `postgres`
* **Jest + Supertest**: 20+ e2e tests

## 🧰 Tech Stack

* **Node.js ≥ 20**, **TypeScript 5**
* **Fastify 5**, **@fastify/swagger**, **@fastify/swagger-ui**
* **fastify-type-provider-zod 6** + **Zod 4**
* **Prisma 5**, **PostgreSQL**
* **Pino** / **pino-pretty**
* **Jest 29**, **Supertest**

## 📦 Scripts

From `package.json`:

```bash
# dev / run
npm run dev         # tsx watch src/server.ts
npm start           # tsx src/server.ts

# build
npm run build       # tsc -p tsconfig.json

# DB & Prisma
npm run generate    # prisma generate
npm run migrate:dev # prisma migrate dev --name init_notes
npm run migrate:deploy
npm run seed        # tsx prisma/seed.ts

# tests & lint
npm test
npm run test:watch
npm run lint

# Docker
npm run docker:up
npm run docker:down
```

## 🗂 Project Structure

```bash
.
├── prisma
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/20250930063958_id_uuid_tags_jsonb/migration.sql
├── src
│   ├── app.ts            # Fastify setup (validators, swagger, routes, error-handler)
│   ├── server.ts         # HTTP server bootstrap
│   ├── bootstrap/env.ts  # .env loader
│   ├── db/prisma.ts      # PrismaClient init
│   ├── errors/
│   │   ├── app-error.ts
│   │   └── handler.ts    # centralized error handler
│   ├── logger/index.ts   # pino/pino-pretty
│   ├── routes/
│   │   ├── health.ts     # GET /health
│   │   └── notes.routes.ts
│   └── utils/cursor.ts   # encode/decode cursor
├── tests
│   ├── notes.test.ts
│   └── setup.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## 🛠️ Environment Setup

1. Copy env example:

    ```bash
    cp .env.example .env
    ```

2. Set your DB connection string (`DATABASE_URL`), e.g.:

    ```bash
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notes?schema=public
    ```

3. Apply Prisma:

    ```bash
    npm run generate
    npm run migrate:dev
    npm run seed         # optional
    ```

## 🐳 Run with Docker

```bash
npm run docker:up
# brings up postgres and api, applies migrations, then starts the server
```

API will be at `http://localhost:3000`, Swagger at `http://localhost:3000/docs`.

Tear down and remove volumes:

```bash
npm run docker:down
```

## 🧪 Tests

```bash
npm test
# or
npm run test:watch
```

Tests spin up the app in-memory and run against a real Postgres (use a separate DB/schema for tests).

## 🗄️ Data Model (Prisma, PostgreSQL)

```prisma
model Note {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  content   String
  tags      Json     @db.JsonB
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([createdAt(sort: Desc), id(sort: Desc)], map: "idx_notes_createdAt_id_desc") // cursor
  @@index([tags], type: Gin, map: "idx_note_tags_gin")                                  // jsonb filters
}
```

* **GIN** index on `tags` (jsonb) for tag filters.
* Pagination by `(createdAt DESC, id DESC)`.

## 🔎 Pagination & Filters

### Cursor Pagination

* First page: `GET /notes?limit=20`
* Response:

```json
{
  "items": [ /* ... */ ],
  "nextCursor": "base64-cursor-or-null"
}
```

* Second page: `GET /notes?limit=20&cursor=<nextCursor>`

### Tag Filters

* Any of: `GET /notes?tagsAny=a&tagsAny=b`
* All of: `GET /notes?tagsAll=a&tagsAll=b`
* CSV also supported: `tagsAny=a,b` / `tagsAll=a,b`.

## 🧾 API (Quick Reference)

### Health eng

`GET /health` → `200`

```json
{ "status": "ok" }
```

### Notes eng

* `GET /notes` — list + pagination + filters

  * query: `limit` (1..100, default 20), `cursor`, `tagsAny[]`, `tagsAll[]`
  * response: `{ items: Note[], nextCursor: string|null }`

* `POST /notes` — create

```json
// request
{ "title": "Title", "content": "Text", "tags": ["a", "b"] }

// response 201
{
  "id":"uuid",
  "title":"Title",
  "content":"Text",
  "tags":["a","b"],
  "createdAt":"2025-09-30T06:12:34.567Z",
  "updatedAt":"2025-09-30T06:12:34.567Z"
}
```

* `GET /notes/:id` — fetch by id
* `PATCH /notes/:id` — partial update (`title?`, `content?`, `tags?`)
* `DELETE /notes/:id` — delete

### Errors (Unified Shape)

Always JSON:

```json
{ "error": "ValidationError", "message": "body/title Invalid input: expected string, received undefined", "reqId": "req-1" }
```

Status codes:

* `400` — validation (Zod/Ajv)
* `404` — not found (Prisma P2025)
* `409` — unique conflict (Prisma P2002)
* `500` — others

## 📘 Swagger eng

Docs available at **`/docs`** (generated from Zod via `fastify-type-provider-zod` → **JSON Schema**).

## 📝 Logs

* Dev: pretty via `pino-pretty`
* Prod: structured JSON to stdout
  Includes request/response logs, `reqId`, timing, and errors.

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `feat/my-feature`
3. Make sure:

   * `npm run lint` — no issues
   * `npm test` — all green
4. Open a PR

## 📄 License

ISC (see `package.json`).

---

### Quick Start (TL;DR)

```bash
cp .env.example .env
npm i
npm run generate
npm run migrate:dev
npm run dev
# Swagger: http://localhost:3000/docs
```


