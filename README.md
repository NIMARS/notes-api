# Notes API

[![build](https://github.com/NIMARS/notes-api/actions/workflows/test.yml/badge.svg)](https://github.com/NIMARS/notes-api/actions/workflows/test.yml)
[![license](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

Live demo: <https://notes-api-vkcj.onrender.com/>
Swagger: <https://notes-api-vkcj.onrender.com/docs>

## 🌍 Языки/Languages

[Русский](#русский) | [English](#english)

## Русский

Backend-сервис заметок на **Fastify + TypeScript + PostgreSQL + Prisma** с фокусом на production-практики:

- модульная архитектура `http -> application -> infrastructure -> domain`
- cursor pagination по `(createdAt, id)`
- фильтрация по `jsonb` (`tagsAny/tagsAll`)
- OpenAPI/Swagger + contract snapshot tests
- bearer auth + RBAC (scopes) для write-операций в `/v1`
- versioning: `/v1/*` + legacy `/notes` (deprecated)

---

## TL;DR

- Архитектура: `http -> application -> infrastructure -> domain` (`src/modules/notes/*`)
- API: основной `/v1/*`, legacy `/notes` оставлен как deprecated alias
- Auth/RBAC: `Bearer <token>` + scopes (`notes:write`, `notes:delete`) для write в `/v1/notes`
- Тесты: `unit + contract + e2e` (раздельные Vitest configs)
- OpenAPI: `/docs` и `/docs/json` (проверяется snapshot-тестом)
- Performance: `docs/perf.md` + `npm run bench:notes`

---

## Демо

1. `npm run docker:up` -> открыть `http://localhost:3000/docs`
2. `GET /v1/notes?limit=20` -> cursor pagination (`nextCursor`)
3. `GET /v1/notes?tagsAny=a&tagsAny=b` / `tagsAll=...` -> jsonb filters
4. `POST /v1/notes` с bearer token -> auth/RBAC поведение
5. `npm test` -> полный прогон `unit + contract + e2e`

---

## Быстрый старт

1. Поднять окружение:

    ```bash
    npm run docker:up
    ```

2. Открыть Swagger:

    ```bash
    http://localhost:3000/docs
    ```

3. Проверить health:

    ```bash
    curl -s http://localhost:3000/health
    curl -s http://localhost:3000/v1/health
    ```

4. Прод-демо (Render): `https://notes-api-vkcj.onrender.com/`

---

## Быстрое демо (30s)

```bash
npm run docker:up && curl --retry 20 --retry-delay 1 --retry-connrefused -s http://localhost:3000/health && curl -s "http://localhost:3000/v1/notes?limit=5"
```

---

## Примеры (curl)

### Публичное чтение (v1)

```bash
curl -s "http://localhost:3000/v1/notes?limit=20"
curl -s "http://localhost:3000/v1/notes?tagsAny=a&tagsAny=b"
curl -s "http://localhost:3000/v1/health"
```

### Аутентифицированная запись (v1)

```bash
# POST /v1/notes requires notes:write
curl -s -X POST http://localhost:3000/v1/notes \
  -H "Authorization: Bearer writer-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"t1","content":"c1","tags":["a","b"]}'

# DELETE /v1/notes/:id requires notes:delete
curl -i -X DELETE http://localhost:3000/v1/notes/<NOTE_ID> \
  -H "Authorization: Bearer admin-token"
```

### Легаси API (устарело, демо совместимости)

```bash
curl -i http://localhost:3000/notes?limit=20
# см. заголовки Deprecation / Sunset / Link
```

---

## Ключевые технические решения

### 1) Cursor pagination (createdAt, id)

**Проблема:** `OFFSET`-пагинация может **пропускать/дублировать** записи при параллельных вставках (особенно в infinite scroll).  
**Решение:** стабильный курсор по `(createdAt DESC, id DESC)`.

**Что это даёт:**

- детерминированный порядок (tie-breaker по `id`),
- быстрый `nextCursor` (кодируется из `createdAt+id`, обычно base64),
- индексируемые запросы (O(log n) на переход между страницами),
- корректность при вставках между запросами клиента.

### 2) Фильтрация по тегам через jsonb + GIN (tagsAny/tagsAll)

Теги хранятся в `tags jsonb` (массив строк), фильтрация делается без отдельной таблицы.

- `tagsAny`: «хотя бы один тег из списка»
- `tagsAll`: «все теги из списка»

В PostgreSQL это удобно выражается через операторы jsonb (`?|` / `?&`) и ускоряется GIN-индексом.

> Когда лучше вынести в отдельную таблицу: очень много тегов на запись, частые агрегаты/аналитика по тегам, сложные связи.

### 3) Единый контракт ошибок

Ошибки приходят в едином формате, удобном для клиентов и логирования:

```json
{ "error": "ValidationError", "message": "body/title Invalid input: expected string, received undefined", "reqId": "req-1" }
```

Типичные коды:

- `400` — валидация (Zod/Ajv)
- `404` — не найдено (Prisma P2025)
- `409` — конфликт уникальности (Prisma P2002)
- `500` — прочее

### 4) Тестовая стратегия (unit + contract + e2e)

Проект использует несколько слоёв тестов:

- `unit` — сервисный слой и cursor logic (быстро, без DB/app setup)
- `contract` — snapshot-проверки `/docs/json` и единого error shape
- `e2e` — API-сценарии (CRUD, пагинация, фильтры, auth/RBAC, legacy compatibility)

Смысл: можно менять реализацию, но контракты API и поведение для клиентов остаются стабильными.

### 5) OpenAPI / Swagger

Документация доступна на **`/docs`** (если SWAGGER_UI=true). Схемы генерируются из Zod через `fastify-type-provider-zod` → JSON Schema.

---

## Производительность

Подробные `EXPLAIN (ANALYZE, BUFFERS)` планы и сравнение до/после индексов: `docs/perf.md`.

Полезные команды:

```bash
npm run seed:perf
npm run bench:notes
```

`bench:notes` показывает latency (`avg/p50/p95`) для сценариев чтения `/notes` (legacy alias; при необходимости скрипт можно переключить на `/v1/notes`) на локальной машине.

---

### 📈 Пример bench:notes

Локальный пример (`npm run bench:notes`, sample на одной машине):

- `notes_no_filter`: `p50 ~7.14ms`, `p95 ~10.55ms`
- `notes_tags_any`: `p50 ~7.10ms`, `p95 ~9.38ms`
- `notes_tags_all`: `p50 ~6.48ms`, `p95 ~8.56ms`
- `notes_tags_mix`: `p50 ~5.99ms`, `p95 ~8.26ms`

Результаты зависят от железа, состояния кэша и набора данных; используйте их как ориентир, а не абсолют.
Полные perf-замеры и `EXPLAIN (ANALYZE, BUFFERS)` см. в `docs/perf.md`.

## 🧪 Тестовая стратегия

Тесты:

```bash
npm run test:unit
npm run test:contract
npm run test:e2e
npm test          # все слои
```

Структура:

- `tests/unit/*` — pure unit tests
- `tests/contracts/*` — snapshot contracts (`/docs/json`, error shape)
- `tests/e2e/*` — API + DB сценарии

Для integration/contract используется отдельный конфиг `vitest.integration.config.ts` с `preload-env.ts` и `tests/setup.ts`.

## CI

GitHub Actions workflow (`.github/workflows/test.yml`) выполняет:

- `npm ci`
- `npm audit --omit=dev --audit-level=high`
- `npm audit --audit-level=high || true`
- `prisma generate`
- `prisma migrate deploy`
- `npm run typecheck`
- `npm run lint`
- `npm test`

---

## ✨ Возможности

- CRUD заметок
- Cursor pagination по `(createdAt DESC, id DESC)` без `OFFSET`
- Фильтры `tagsAny` / `tagsAll` по `jsonb`
- OpenAPI/Swagger (`/docs`, `/docs/json`)
- Единый error contract `{ error, message, reqId?, details? }`
- Bearer auth + RBAC scopes для POST и DELETE операций в `/v1/notes`
- Версионирование API (`/v1`) + legacy `/notes` с deprecation headers
- Unit / Contract / E2E тесты
- Docker Compose (API + PostgreSQL)
- Benchmark script (`npm run bench:notes`)

## 🧰 Технологии

- Node.js 20+, TypeScript 5
- Fastify 5, Zod 4, fastify-type-provider-zod
- PostgreSQL, Prisma 7, pg
- Pino
- Vitest 4, Supertest
- Docker, Docker Compose
- GitHub Actions

## 📦 Скрипты

```bash
# dev / run
npm run dev
npm start

# build / checks
npm run build
npm run typecheck
npm run lint

# prisma / db
npm run generate
npm run migrate:dev
npm run migrate:deploy
npm run seed
npm run seed:perf

# tests
npm run test:unit
npm run test:contract
npm run test:e2e
npm run test:all
npm test
npm run test:watch
npm run test:coverage

# perf
npm run bench:notes

# docker
npm run docker:up
npm run docker:down

# security
npm run audit:prod

```

## 🧱 Архитектура и поток данных

Основной поток запроса:
`HTTP route -> handler -> service -> repository (Prisma/Postgres) -> mapper -> DTO response`

Роли слоёв:

- `http` — роуты, схемы, auth guards, HTTP-ответы
- `application` — use-cases / бизнес-логика / ошибки not-found
- `infrastructure` — Prisma и SQL/query детали
- `domain` — entity/DTO/commands/mappers

## 🗂 Структура проекта

```text
.
├── docs/
│   └── perf.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/
│   └── bench-notes.ts
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── auth/
│   │   └── bearer-auth.ts
│   ├── bootstrap/
│   │   └── env.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── errors/
│   │   ├── app-error.ts
│   │   ├── error-response.ts
│   │   └── handler.ts
│   ├── modules/
│   │   └── notes/
│   │       ├── application/
│   │       │   ├── notes.repository.ts
│   │       │   └── notes.service.ts
│   │       ├── domain/
│   │       │   ├── note.commands.ts
│   │       │   ├── note.dto.ts
│   │       │   ├── note.entity.ts
│   │       │   └── note.mapper.ts
│   │       ├── http/
│   │       │   ├── note.handlers.ts
│   │       │   ├── note.schemas.ts
│   │       │   └── notes.routes.ts
│   │       └── infrastructure/
│   │           └── prisma-notes.repository.ts
│   ├── routes/
│   │   ├── health.ts
│   │   └── v1/index.ts
│   └── utils/
│       └── cursor.ts
├── tests/
│   ├── contracts/
│   ├── e2e/
│   ├── unit/
│   └── setup.ts
├── preload-env.ts
├── vitest.config.ts
├── vitest.unit.config.ts
├── vitest.integration.config.ts
├── docker-compose.yml
├── Dockerfile
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

- По `tags` создан **GIN**-индекс (jsonb).
- Пагинация по `(createdAt DESC, id DESC)`.

## 🔎 Пагинация и фильтры

### Курсорная пагинация

- Запрос первой страницы: `GET /v1/notes?limit=20`
- Ответ:

```json
{
  "items": [ /* ... */ ],
  "nextCursor": "base64-строка-курcора-или-null"
}
```

- Вторая страница: `GET /v1/notes?limit=20&cursor=<nextCursor>`

### Фильтр по тегам

- Любая из меток: `GET /v1/notes?tagsAny=a&tagsAny=b`
- Все метки: `GET /v1/notes?tagsAll=a&tagsAll=b`
- Также поддерживается CSV: `tagsAny=a,b` / `tagsAll=a,b`.

## 🧾 API (кратко)

### Versioning

- Основной API: `/v1/*`
- Legacy alias: `/notes` (deprecated, временно для совместимости)
- Health доступен по `/health` и `/v1/health`

### Compatibility Policy

- Новые фичи добавляются в `/v1`
- Legacy `/notes` считается deprecated до **July 1, 2026**
- После даты удаления поддерживается только `/v1/*`
- Заголовки `Deprecation`, `Sunset`, `Link` отдаются для legacy `/notes` маршрутов

### Health

`GET /health` и `GET /v1/health` → `200`

```json
{ "status": "ok" }
```

### Notes

- `GET /v1/notes` — список + пагинация + фильтры (legacy alias: `GET /notes`)

  - query: `limit` (1..100, по умолчанию 20), `cursor`, `tagsAny[]`, `tagsAll[]`
  - ответ: `{ items: Note[], nextCursor: string|null }`

- `POST /v1/notes` — создать (требует `notes:write`; legacy alias `POST /notes` временно публичный и deprecated)

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

- `GET /v1/notes/:id` — получить по id (legacy alias: `/notes/:id`)
- `PATCH /v1/notes/:id` — частичное обновление (`title?`, `content?`, `tags?`) (legacy alias: `/notes/:id`)
- `DELETE /v1/notes/:id` — удалить (требует `notes:delete`; legacy alias: `/notes/:id`)

### Ошибки (единый формат)

Всегда JSON вида:

```json
{ "error": "ValidationError", "message": "body/title Invalid input: expected string, received undefined", "reqId": "req-1" }
```

Коды:

- `400` — валидация (Zod/Ajv)
- `404` — не найдено (Prisma P2025)
- `409` — конфликт уникальности (Prisma P2002)
- `500` — прочее

## 🔐 Authentication / RBAC

POST и DELETE операции в `/v1/notes` защищены bearer token + scopes.

### Header

```http
Authorization: Bearer <token>
```

### Scopes

- `POST /v1/notes` -> `notes:write`
- `DELETE /v1/notes/:id` -> `notes:delete`

### Примеры токенов (по умолчанию)

`AUTH_TOKENS_JSON` (env) может выглядеть так:

```json
{
  "reader-token": [],
  "writer-token": ["notes:write"],
  "admin-token": ["notes:write", "notes:delete"]
}
```

### Ожидаемое поведение

- без токена -> `401`
- невалидный токен -> `401`
- валидный токен без нужного scope -> `403`
- валидный токен с нужным scope -> `201` / `204`

### Примеры

```bash
# 401
curl -i -X POST http://localhost:3000/v1/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"t","content":"c","tags":["a"]}'

# 403 (reader-token без notes:write)
curl -i -X POST http://localhost:3000/v1/notes \
  -H "Authorization: Bearer reader-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"t","content":"c","tags":["a"]}'

# 201 (writer-token)
curl -i -X POST http://localhost:3000/v1/notes \
  -H "Authorization: Bearer writer-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"t","content":"c","tags":["a"]}'
```

## 📘 Swagger / OpenAPI

- UI: `/docs` (если `SWAGGER_UI=true`)
- JSON schema: `/docs/json`
- OpenAPI содержит `securitySchemes.bearerAuth` (для protected write-операций в `/v1/notes`)
- Контракт `/docs/json` проверяется snapshot-тестом (`tests/contracts/openapi.contract.test.ts`)

## 📝 Логи

- Dev: красиво через `pino-pretty`
- Prod: структурированный JSON в stdout
  Логи запросов/ответов, `reqId`, время обработки, ошибки.

## 🤝 Контрибуции

1. Форкни репозиторий
2. Создай ветку: `feat/my-feature`
3. Убедись, что:

   - `npm run lint` — без ошибок
   - `npm test` — все зелёные
4. Открой PR

## 📄 Лицензия

ISC (см. `package.json`).

---

## 🌍 Languages/Языки

[Русский](#русский) | [English](#english)

## English

### Overview

Notes API is a **Fastify + TypeScript + PostgreSQL + Prisma** backend focused on production-oriented practices:

- layered architecture: `http -> application -> infrastructure -> domain`
- cursor pagination by `(createdAt, id)`
- `jsonb` tag filtering (`tagsAny`, `tagsAll`)
- OpenAPI/Swagger + contract snapshot tests
- bearer auth + RBAC scopes for **POST/DELETE** in `/v1/notes`
- versioned API: `/v1/*` + deprecated legacy `/notes`

### TL;DR eng

- Main API: `/v1/*`
- Legacy compatibility alias: `/notes` (deprecated; returns `Deprecation`, `Sunset`, `Link` headers)
- Tests: `unit + contract + e2e`
- OpenAPI: `/docs` and `/docs/json`
- Performance notes: `docs/perf.md`
- Benchmark script: `npm run bench:notes`

### Quick Commands

```bash
npm run docker:up
npm test
npm run bench:notes
```

### API Versioning / Compatibility

- New features go to `/v1`
- Legacy `/notes` is deprecated until **July 1, 2026**
- After removal date, only `/v1/*` will be supported

### Authentication / RBAC

`POST` and `DELETE` routes in `/v1/notes` require bearer token + scopes.

Header:

```http
Authorization: Bearer <token>
```

Scopes:

- `POST /v1/notes` -> `notes:write`
- `DELETE /v1/notes/:id` -> `notes:delete`

Default token examples (`AUTH_TOKENS_JSON`):

```json
{
  "reader-token": [],
  "writer-token": ["notes:write"],
  "admin-token": ["notes:write", "notes:delete"]
}
```

Expected behavior:

- missing token -> `401`
- invalid token -> `401`
- valid token without required scope -> `403`
- valid token with required scope -> `201` / `204`

### Test Strategy

- `tests/unit/*` — pure unit tests (service layer, cursor logic)
- `tests/contracts/*` — snapshots for `/docs/json` and error shape
- `tests/e2e/*` — API + DB scenarios (CRUD, pagination, filters, auth/RBAC, legacy compatibility)

Run:

```bash
npm run test:unit
npm run test:contract
npm run test:e2e
npm test
```

### Architecture / Data Flow

Request flow:
`HTTP route -> handler -> service -> repository (Prisma/Postgres) -> mapper -> DTO response`

Layers:

- `http` — routes, schemas, auth guards, HTTP responses
- `application` — use-cases / business logic / not-found behavior
- `infrastructure` — Prisma and query details
- `domain` — entities / DTOs / commands / mappers

### Scripts (from package.json)

```bash
# dev / run
npm run dev
npm start

# build / checks
npm run build
npm run typecheck
npm run lint

# prisma / db
npm run generate
npm run migrate:dev
npm run migrate:deploy
npm run seed
npm run seed:perf

# tests
npm run test:unit
npm run test:contract
npm run test:e2e
npm run test:all
npm test
npm run test:watch
npm run test:coverage

# perf
npm run bench:notes

# docker
npm run docker:up
npm run docker:down

# security
npm run audit:prod
```

### Project Structure

```text
.
├── docs/
│   └── perf.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/
│   └── bench-notes.ts
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── auth/
│   │   └── bearer-auth.ts
│   ├── bootstrap/
│   │   └── env.ts
│   ├── db/
│   │   └── prisma.ts
│   ├── errors/
│   │   ├── app-error.ts
│   │   ├── error-response.ts
│   │   └── handler.ts
│   ├── modules/
│   │   └── notes/
│   │       ├── application/
│   │       │   ├── notes.repository.ts
│   │       │   └── notes.service.ts
│   │       ├── domain/
│   │       │   ├── note.commands.ts
│   │       │   ├── note.dto.ts
│   │       │   ├── note.entity.ts
│   │       │   └── note.mapper.ts
│   │       ├── http/
│   │       │   ├── note.handlers.ts
│   │       │   ├── note.schemas.ts
│   │       │   └── notes.routes.ts
│   │       └── infrastructure/
│   │           └── prisma-notes.repository.ts
│   ├── routes/
│   │   ├── health.ts
│   │   └── v1/index.ts
│   └── utils/
│       └── cursor.ts
├── tests/
│   ├── contracts/
│   ├── e2e/
│   ├── unit/
│   └── setup.ts
├── preload-env.ts
├── vitest.config.ts
├── vitest.unit.config.ts
├── vitest.integration.config.ts
├── docker-compose.yml
├── Dockerfile
└── README.md
```

### Swagger / OpenAPI

- UI: `/docs` (if `SWAGGER_UI=true`)
- JSON schema: `/docs/json`
- OpenAPI includes `securitySchemes.bearerAuth` (for protected writes in `/v1/notes`)
- `/docs/json` is covered by snapshot contract tests

### License

ISC (see `package.json`).

---
