# План: Профессиональная система конфигурации

## Обзор

Переход на централизованную YAML-based систему конфигурации с:
- Zod валидацией схемы
- ENV overrides для секретов
- YAML anchors для DRY
- Типобезопасность через TypeScript

## Архитектурные решения

| Аспект | Решение |
|--------|---------|
| Архитектура | Централизованный (один `config.yml` в корне) |
| Окружения | Один файл + ENV overrides |
| Секреты | В YAML для local dev, через `${ENV_VAR}` синтаксис |

## Структура YAML

```yaml
# config.yml

# ═══════════════════════════════════════════════════════════════════
# GLOBAL SETTINGS
# ═══════════════════════════════════════════════════════════════════
global:
  environment: development        # development | staging | production
  log_level: debug                # debug | info | warn | error

# ═══════════════════════════════════════════════════════════════════
# SHARED RESOURCES (YAML anchors для DRY)
# ═══════════════════════════════════════════════════════════════════
shared:
  database:
    default: &db_default
      host: localhost
      port: 5432
      user: postgres
      password: postgres
      database: portal
      schema: portal

  storage:
    default: &storage_default
      endpoint: http://localhost:9000
      access_key: minioadmin
      secret_key: minioadmin
      region: us-east-1
      path_style: true

# ═══════════════════════════════════════════════════════════════════
# SERVICES
# ═══════════════════════════════════════════════════════════════════
services:
  apps:
    ports:
      admin_graphql: 10001
      metrics: 3033
    database:
      <<: *db_default
    graphql:
      path: /graphql

  checkout:
    ports:
      storefront_graphql: 10002
      metrics: 3031
    database:
      <<: *db_default

  delivery: {}

  inventory:
    ports:
      admin_graphql: 10005
      metrics: 3034
    database:
      <<: *db_default
      schema: null
    storage:
      <<: *storage_default
      bucket: inventory

  media:
    ports:
      admin_graphql: 10007
      metrics: 3035
    database:
      <<: *db_default
    graphql:
      path: /graphql/admin
    storage:
      <<: *storage_default
      bucket: media

  orders:
    ports:
      storefront_graphql: 10003
      metrics: 3032
    database:
      <<: *db_default

  payments: {}

  pricing: {}

  project:
    ports:
      admin_graphql: 10009
      metrics: 3036
    database:
      <<: *db_default

  users:
    ports:
      admin_graphql: 10010
      metrics: 3037
    casdoor:
      endpoint: ${CASDOOR_ENDPOINT}
      client_id: ${CASDOOR_CLIENT_ID}
      client_secret: ${CASDOOR_CLIENT_SECRET}
      application_name: ${CASDOOR_APPLICATION_NAME}
      organization_name: ${CASDOOR_ORGANIZATION_NAME}
      certificate: ${CASDOOR_CERTIFICATE}
      google_provider: ${CASDOOR_GOOGLE_PROVIDER}
      oauth_redirect_uri: ${CASDOOR_OAUTH_REDIRECT_URI}
```

## Сервисы

| Сервис | Тип | Порты | Database | Storage | Casdoor |
|--------|-----|-------|----------|---------|---------|
| apps | Admin GraphQL | 10001, 3033 | + | - | - |
| checkout | Storefront GraphQL | 10002, 3031 | + | - | - |
| delivery | Worker | - | - | - | - |
| inventory | Admin GraphQL | 10005, 3034 | + | + | - |
| media | Admin GraphQL | 10007, 3035 | + | + | - |
| orders | Storefront GraphQL | 10003, 3032 | + | - | - |
| payments | Worker | - | - | - | - |
| pricing | Worker | - | - | - | - |
| project | Admin GraphQL | 10009, 3036 | + | - | - |
| users | Admin GraphQL | 10010, 3037 | - | - | + |

## План реализации

### Этап 1: Zod схема валидации

Файл: `packages/shared-service-config/src/schema.ts`

```typescript
import { z } from "zod";

// Shared schemas
const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  schema: z.string().nullable().optional(),
});

const StorageConfigSchema = z.object({
  endpoint: z.string().url(),
  access_key: z.string(),
  secret_key: z.string(),
  bucket: z.string(),
  region: z.string().optional(),
  path_style: z.boolean().optional(),
});

const CasdoorConfigSchema = z.object({
  endpoint: z.string(),
  client_id: z.string(),
  client_secret: z.string(),
  application_name: z.string(),
  organization_name: z.string(),
  certificate: z.string(),
  google_provider: z.string().optional(),
  oauth_redirect_uri: z.string().optional(),
});

const PortsConfigSchema = z.object({
  admin_graphql: z.number().int().positive().optional(),
  storefront_graphql: z.number().int().positive().optional(),
  metrics: z.number().int().positive().optional(),
});

const GraphQLConfigSchema = z.object({
  path: z.string(),
});

// Service schemas
const BaseServiceSchema = z.object({
  ports: PortsConfigSchema.optional(),
  database: DatabaseConfigSchema.optional(),
  storage: StorageConfigSchema.optional(),
  graphql: GraphQLConfigSchema.optional(),
});

// Full config schema
export const ConfigSchema = z.object({
  global: z.object({
    environment: z.enum(["development", "staging", "production"]),
    log_level: z.enum(["debug", "info", "warn", "error"]),
  }),
  shared: z.object({
    database: z.object({ default: DatabaseConfigSchema }).optional(),
    storage: z.object({ default: StorageConfigSchema }).optional(),
  }).optional(),
  services: z.object({
    apps: BaseServiceSchema,
    checkout: BaseServiceSchema,
    delivery: BaseServiceSchema,
    inventory: BaseServiceSchema,
    media: BaseServiceSchema,
    orders: BaseServiceSchema,
    payments: BaseServiceSchema,
    pricing: BaseServiceSchema,
    project: BaseServiceSchema,
    users: BaseServiceSchema.extend({
      casdoor: CasdoorConfigSchema.optional(),
    }),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### Этап 2: Config Loader с ENV overrides

Файл: `packages/shared-service-config/src/configLoader.ts`

- Загрузка YAML файла
- Подстановка `${ENV_VAR}` из process.env
- Валидация через Zod схему
- Кэширование загруженного конфига

### Этап 3: Helper функции

Файл: `packages/shared-service-config/src/helpers.ts`

```typescript
// Централизованные helpers вместо дублирования в каждом сервисе
export function buildDatabaseUrl(config: DatabaseConfig): string;
export function isDevelopment(config: GlobalConfig): boolean;
```

### Этап 4: Типизированный API для сервисов

```typescript
// Использование в сервисе
import { loadServiceConfig } from "@shopana/shared-service-config";

const config = loadServiceConfig("users");
// config.ports.admin_graphql - типизирован
// config.casdoor - доступен только для users
```

### Этап 5: Удаление config.ts из сервисов

Удалить `config.ts` из каждого сервиса и заменить на импорт:

```typescript
// Было: services/users/src/config.ts (файл с логикой)
// Стало: просто импорт
import { getServiceConfig } from "@shopana/shared-service-config";

const config = getServiceConfig("users");
```

Сервисы для миграции:
- [ ] apps
- [ ] checkout
- [ ] delivery
- [ ] inventory
- [ ] media
- [ ] orders
- [ ] payments
- [ ] pricing
- [ ] project
- [ ] users

## Улучшения по сравнению с текущей системой

| Аспект | Было | Стало |
|--------|------|-------|
| Валидация | Только TypeScript типы | Zod runtime валидация |
| DRY | Дублирование database_url | YAML anchors |
| Структура | Плоские ключи | Вложенные объекты |
| ENV | Нет поддержки | `${ENV_VAR}` синтаксис |
| Helpers | Дублирование в сервисах | Централизованные в пакете |
| Worker сервисы | `port: 0` | Без секции `ports` |

## Файлы для изменения

```
packages/shared-service-config/
├── src/
│   ├── index.ts           # обновить exports
│   ├── schema.ts          # NEW: Zod схемы
│   ├── configLoader.ts    # обновить с ENV support
│   ├── helpers.ts         # NEW: централизованные helpers
│   └── types.ts           # удалить (заменяется Zod infer)

services/*/src/config.ts   # УДАЛИТЬ из всех сервисов

config.yml                 # NEW: основной конфиг (переименовать из config.local.yml)
```
