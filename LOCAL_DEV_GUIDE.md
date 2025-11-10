# 🚀 Локальная Разработка - Полное Руководство

> **TL;DR:** `make dev` - запускает ВСЁ (Node.js + Go) одной командой!

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Что создано](#что-создано)
- [Как это работает](#как-это-работает)
- [Команды](#команды)
- [Конфигурация](#конфигурация)
- [Troubleshooting](#troubleshooting)
- [Ansible vs Прямой запуск](#ansible-vs-прямой-запуск)
- [FAQ](#faq)

---

## Быстрый старт

### Шаг 1: Проверьте инфраструктуру

```bash
make dev:status
```

Должны быть запущены:
- ✅ NATS (localhost:4222)
- ✅ PostgreSQL (localhost:5432)
- ✅ MinIO (localhost:9000)

Если что-то не запущено:

```bash
docker-compose -f docker-compose.dev-infrastructure.yml \
  --profile local-db --profile local-storage up -d
```

### Шаг 2: Запустите ВСЁ одной командой

```bash
make dev
```

**Готово!** 🎉

Эта команда запустит:
- ✅ **Orchestrator** (Node.js) - 5 сервисов: apps, delivery, inventory, payments, pricing
- ✅ **Platform** (Go) - CMS монолит

**Альтернатива (запуск по отдельности):**

```bash
# Только Node.js сервисы
make dev:orchestrator

# Только Platform (Go)
make dev:platform
```

Orchestrator запустит все 5 сервисов:
- ✅ **apps** - Admin GraphQL API (`:10001`)
- ✅ **delivery** - Доставка (Nova Poshta, Meest)
- ✅ **inventory** - Управление товарами и импорты
- ✅ **payments** - Платежная система
- ✅ **pricing** - Ценообразование и акции

### Доступные endpoint'ы

```
GraphQL API:  http://localhost:10001/graphql
Health check: http://localhost:10001/
Metrics:      http://localhost:3030/metrics

NATS HTTP:    http://localhost:8222
MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
```

### Шаг 3 (по необходимости): Запустите Platform и Apollo

**Не обязательно!** Запускайте только если работаете с CMS или медиа.

```bash
# В отдельных терминалах:

# Platform монолит (Go) - Основной CMS (старая архитектура)
make dev:platform

# ИЛИ Project Service (Go) - Новый модульный CMS
make dev:platform-project

# Media Service (Go) - Загрузка и управление файлами
make dev:platform-media

# Apollo Router (GraphQL Gateway)
make apollo:admin       # Для admin API
# или
make apollo:storefront  # Для storefront API
```

**Когда это нужно:**
- Работа с CMS функциональностью (проекты, пользователи, валюты)
- Загрузка/управление медиа файлами
- Тестирование GraphQL Federation через Apollo Gateway

### Остановка

Нажмите **Ctrl+C** в терминале где запущен orchestrator.

Остановить инфраструктуру:
```bash
make dev:down
```

---

## Что создано

### Новые файлы (18)

#### Конфигурация
- `config.dev.yml` - Конфигурация для localhost (вместо Docker имен)
- `.env` - Переменные окружения
- `scripts/kill-port.sh` - Helper скрипт

#### Docker Compose
- `docker-compose.dev-infrastructure.yml` - Инфраструктура (NATS, PostgreSQL, MinIO)
- `docker-compose.dev-services.yml` - Сервисы с profiles

#### Ansible Playbooks
- `ansible/playbooks/local-dev/dev-up.yml` - Автоматическое развертывание
- `ansible/playbooks/local-dev/dev-down.yml` - Остановка
- `ansible/playbooks/local-dev/README.md`
- `ansible/playbooks/local-dev/vars/dev.yml` - Кастомная конфигурация
- `ansible/playbooks/local-dev/vars/preset-*.yml` (3 пресета)
- `ansible/playbooks/local-dev/templates/*.j2` (2 шаблона)

#### Документация
- `LOCAL_DEV_GUIDE.md` - Этот файл ⭐
- `docs/ANSIBLE_VS_DIRECT.md` - Сравнение способов запуска

### Измененные файлы (4)

1. **`packages/shared-service-config/src/configLoader.ts`**
   - Добавлена поддержка переменной окружения `CONFIG_FILE`
   - Позволяет выбирать config файл

2. **`Makefile`**
   - Все `dev:*` команды используют `CONFIG_FILE=config.dev.yml`
   - Добавлены команды: `dev:up`, `dev:down`, `dev:status`, `dev:logs`, `dev:help`
   - Автоматическое освобождение порта перед запуском orchestrator

3. **`docker-compose.dev-services.yml`**
   - Удалены `depends_on: nats` (так как nats в другом файле)

4. **`packages/shared-service-config/dist/*`**
   - Пересобранный пакет после изменений

---

## Как это работает

### Архитектура

```
                      config.dev.yml (localhost)
                              ↓
        ┌─────────────────────────────────────────┐
        │                                         │
        ↓                                         ↓
┌───────────────────┐                  ┌──────────────────┐
│ Infrastructure    │  Docker          │ Apollo Router    │ Docker
│ - NATS            │  :4222           │ - Admin          │ :4000
│ - PostgreSQL      │  :5432           │ - Storefront     │ :4001
│ - MinIO           │  :9000           └──────────────────┘
└─────────┬─────────┘                           │
          │                                     │ Federation
          │                                     ↓
          ↓                          ┌─────────────────────┐
┌─────────────────┐                  │                     │
│ Orchestrator    │  Local           ↓                     ↓
│ (Node.js)       │  :3030    ┌─────────────┐    ┌─────────────┐
│ - apps          │  :10001   │ Checkout    │    │ Orders      │
│ - delivery      │  :10004   │ GraphQL     │    │ GraphQL     │
│ - inventory     │  :10005   │ Subgraph    │    │ Subgraph    │
│ - payments      │  :10006   └─────────────┘    └─────────────┘
│ - pricing       │  :10008
└─────────────────┘
          │
          │ gRPC :50051
          ↓
┌─────────────────┐
│ Platform (Go)   │  Local
│ - project       │  CMS монолит
│ - media         │  Файлы/S3
└─────────────────┘
```

**Легенда:**
- 🟦 **Обязательные** - Infrastructure + Orchestrator (для работы нужен только этот минимум)
- 🟨 **По необходимости** - Platform (если работаете с CMS)
- 🟨 **По необходимости** - Apollo (если нужен единый GraphQL Gateway)

### Конфигурационная система

1. **config.yml** (производство/Docker)
   ```yaml
   moleculer_transporter: nats://nats:4222
   platform_grpc_host: platform:50051
   ```

2. **config.dev.yml** (локальная разработка)
   ```yaml
   moleculer_transporter: nats://localhost:4222
   platform_grpc_host: localhost:50051
   object_storage_endpoint: http://localhost:9000
   ```

3. **Выбор конфига** через переменную окружения:
   ```bash
   CONFIG_FILE=config.dev.yml make dev:orchestrator
   ```

### Почему это работает

- Инфраструктура в Docker открывает порты на localhost
- config.dev.yml использует localhost вместо Docker имен
- Сервисы запускаются локально с hot reload
- Все подключаются к localhost:4222 (NATS), localhost:5432 (PostgreSQL)

---

## Команды

### Основные команды

```bash
# 🚀 Запустить ВСЁ (Orchestrator + Platform)
make dev

# Запустить только orchestrator (Node.js сервисы)
make dev:orchestrator

# Запустить отдельные сервисы
make dev:checkout       # Checkout GraphQL API (:10002)
make dev:orders         # Orders GraphQL API (:10003)
make dev:apps           # Apps Admin GraphQL API (:10001)
make dev:inventory      # Inventory сервис (:10005)
make dev:pricing        # Pricing сервис (:10008)
make dev:shipping       # Delivery сервис (:10004)

# Управление инфраструктурой
make dev:status         # Статус всех сервисов
make dev:logs           # Логи Docker сервисов
make dev:down           # Остановить инфраструктуру

# Логи (если используется make dev)
tail -f /tmp/orchestrator.log   # Node.js сервисы
tail -f /tmp/platform.log        # Platform (Go)

# Справка
make dev:help           # Показать все команды
```

### Platform команды (Go сервисы)

```bash
# Из корня services/ - автоматически используют .env.dev
make dev:platform          # Platform монолит (старый CMS)
make dev:platform-project  # Project Service (новый модульный)
make dev:platform-media    # Media Service (файлы/S3)

# Или напрямую из platform/ (нужно вручную скопировать .env.dev)
cd platform
cp .env.dev .env
make start           # Platform монолит
make project:start   # Project Service
make media:start     # Media Service

# Build бинарники
cd platform
make project:build   # → build/project-service
make media:build     # → build/media-service

# Database
cd platform
make db:start        # Запустить PostgreSQL через Docker
make db:migrate      # Применить миграции
```

**Важно:** Platform сервисы используют:
- gRPC: `localhost:50051` (Platform/Project), `localhost:50052` (Media)
- GraphQL: порты настраиваются в конфиге
- База: `localhost:5432` (та же что и для Node.js сервисов)
- S3: `localhost:9000` (MinIO)

### Apollo команды (GraphQL Gateway)

```bash
# Apollo Router для Federation
make apollo:admin       # Admin API Gateway (композиция всех admin subgraphs)
make apollo:storefront  # Storefront API Gateway (композиция storefront subgraphs)
```

**Что делает Apollo:**
- Объединяет GraphQL subgraphs из checkout, orders, apps в единый endpoint
- Маршрутизирует запросы к нужным сервисам
- Обеспечивает Federation v2

### Docker команды

```bash
# Запустить инфраструктуру
docker-compose -f docker-compose.dev-infrastructure.yml \
  --profile local-db --profile local-storage up -d

# Остановить инфраструктуру
docker-compose -f docker-compose.dev-infrastructure.yml down

# Посмотреть логи
docker-compose -f docker-compose.dev-infrastructure.yml logs -f

# Перезапустить конкретный сервис
docker-compose -f docker-compose.dev-infrastructure.yml restart postgres

# Проверить health
curl http://localhost:8222/healthz  # NATS
docker-compose -f docker-compose.dev-infrastructure.yml ps
```

### Полезные команды

```bash
# Пересобрать shared пакеты
make build:packages

# Убить процесс на порту
./scripts/kill-port.sh 3030

# Проверить что слушает порт
lsof -i :3030

# Посмотреть процессы Node.js
ps aux | grep node

# Проверить подключение к PostgreSQL
docker exec shopana-postgres-dev psql -U postgres -d portal -c "SELECT 1"
```

---

## Конфигурация

### config.dev.yml

Основной конфигурационный файл для локальной разработки:

```yaml
vars:
  environment: development
  log_level: debug
  moleculer_transporter: nats://localhost:4222
  platform_grpc_host: localhost:50051

  # MinIO/S3
  object_storage_endpoint: http://localhost:9000
  object_storage_access_key: minioadmin
  object_storage_secret_key: minioadmin
  object_storage_bucket: shopana-sandbox

services:
  orchestrator:
    services: [apps, delivery, inventory, payments, pricing]
    metrics_port: 3030

  checkout:
    storefront_graphql_port: 10002
    transporter: "nats://localhost:4222"
    database_url: "postgresql://postgres:postgres@localhost:5432/portal"
```

### .env

Дополнительные переменные окружения:

```bash
# MinIO
OBJECT_STORAGE_ENDPOINT=http://localhost:9000
OBJECT_STORAGE_ACCESS_KEY=minioadmin
OBJECT_STORAGE_SECRET_KEY=minioadmin

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portal

# Platform
PLATFORM_GRPC_HOST=localhost:50051

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

### Изменение портов

Если нужно изменить порты (например, 3030 занят):

1. Измените в `config.dev.yml`:
```yaml
services:
  orchestrator:
    metrics_port: 3333  # Новый порт
```

2. Перезапустите orchestrator

---

## Troubleshooting

### Orchestrator не запускается

#### Ошибка: Port 3030 already in use

**Причина:** Старый процесс orchestrator всё ещё работает.

**Решение:**
```bash
# Убить процесс на порту
./scripts/kill-port.sh 3030

# Или вручную
lsof -i :3030
kill -9 <PID>

# Или убить все Node.js процессы
pkill -9 node
```

#### Ошибка: ECONNREFUSED localhost:5432

**Причина:** PostgreSQL не запущен.

**Решение:**
```bash
# Проверить статус
docker ps | grep postgres

# Запустить PostgreSQL
docker-compose -f docker-compose.dev-infrastructure.yml \
  --profile local-db up -d

# Подождать пока станет healthy
docker-compose -f docker-compose.dev-infrastructure.yml ps
```

#### Ошибка: ECONNREFUSED localhost:4222

**Причина:** NATS не запущен.

**Решение:**
```bash
# Проверить NATS
curl http://localhost:8222/healthz

# Запустить NATS
docker-compose -f docker-compose.dev-infrastructure.yml up -d nats

# Проверить логи
docker logs shopana-nats-dev
```

### Ошибки с базой данных

#### Database "portal" does not exist

**Решение:**
```bash
# Создать базу данных
docker exec shopana-postgres-dev createdb -U postgres portal

# Или подключиться и создать вручную
docker exec -it shopana-postgres-dev psql -U postgres
CREATE DATABASE portal;
\q
```

#### Connection pool exhausted

**Причина:** Слишком много подключений к базе.

**Решение:**
```bash
# Перезапустить PostgreSQL
docker-compose -f docker-compose.dev-infrastructure.yml restart postgres

# Или увеличить лимит в docker-compose.dev-infrastructure.yml
environment:
  POSTGRES_MAX_CONNECTIONS: 200
```

### Ошибки с MinIO

#### Bucket does not exist

**Решение:**
```bash
# Создать bucket через MinIO console
# http://localhost:9001 (minioadmin/minioadmin)
# Или через CLI:

docker exec shopana-minio-dev mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec shopana-minio-dev mc mb local/shopana-sandbox
```

### Общие проблемы

#### Сервисы тормозят / не отвечают

**Решение:**
```bash
# Перезапустить всё
make dev:down
docker-compose -f docker-compose.dev-infrastructure.yml down
sleep 2
docker-compose -f docker-compose.dev-infrastructure.yml \
  --profile local-db --profile local-storage up -d
sleep 5
make dev:orchestrator
```

#### Hot reload не работает

**Проверка:**
1. Убедитесь что запускаете через `make dev:*` (не через Docker)
2. Проверьте что используется `tsx watch` или `yarn dev` в package.json
3. Файлы должны быть в монтированной директории (не в Docker volume)

#### Config не подхватывается

**Причина:** Запускаете без `CONFIG_FILE`.

**Решение:**
```bash
# Правильно (через Makefile)
make dev:orchestrator

# Неправильно
yarn workspace @shopana/orchestrator-service run dev  # Использует config.yml

# Правильно вручную
CONFIG_FILE=config.dev.yml yarn workspace @shopana/orchestrator-service run dev
```

---

## Ansible vs Прямой запуск

### Два способа

#### 1️⃣ Прямой запуск (РЕКОМЕНДУЕТСЯ)

```bash
make dev:orchestrator
```

**Плюсы:**
- ✅ Быстро (2 секунды)
- ✅ Просто (1 команда)
- ✅ Логи сразу видны
- ✅ Hot reload работает

**Минусы:**
- ❌ Нужно вручную запустить инфраструктуру

**Когда использовать:**
- Ежедневная разработка ⭐
- Быстрое тестирование
- Работа над 1-2 сервисами

#### 2️⃣ Через Ansible

```bash
make dev:up PRESET=preset-minimal
```

**Плюсы:**
- ✅ Автоматическая настройка всего
- ✅ Поддержка сложных конфигураций
- ✅ Генерирует helper скрипты

**Минусы:**
- ❌ Медленнее (собирает Docker образы)
- ❌ Сложнее настроить
- ❌ Требует понимания Ansible

**Когда использовать:**
- Первый запуск
- Production-like тестирование
- CI/CD автоматизация

### Почему возникла ошибка с `make dev:up`?

Ansible пытался собрать Docker образы, которым нужен `BASE_IMAGE`. Для локальной разработки это не нужно - просто запускайте сервисы локально.

### Сравнение

| Задача | Прямой | Ansible |
|--------|--------|---------|
| Запуск orchestrator | `make dev:orchestrator` | `make dev:up` + скрипт |
| Время запуска | 2 сек | 30+ сек |
| Сложность | Низкая | Средняя |
| Гибкость | Низкая | Высокая |

**Рекомендация:** Используйте прямой запуск для ежедневной разработки.

---

## FAQ

### Общие вопросы

**Q: Как проверить что всё работает?**

A:
```bash
# 1. Проверить инфраструктуру
make dev:status

# 2. Проверить NATS
curl http://localhost:8222/healthz

# 3. Запустить orchestrator
make dev:orchestrator

# 4. В другом терминале проверить GraphQL
curl http://localhost:10001/graphql
```

**Q: Можно ли запустить без Docker?**

A: Нет, NATS/PostgreSQL/MinIO должны быть в Docker. Но можно использовать облачные сервисы (Neon для PostgreSQL, удаленный S3).

**Q: Как запустить только один сервис?**

A:
```bash
make dev:checkout  # Только checkout
make dev:orders    # Только orders
```

**Q: Нужно ли пересобирать после изменения кода?**

A: Нет! Hot reload работает автоматически для локальных сервисов. Только если меняете shared packages - нужен `make build:packages`.

### Конфигурация

**Q: Как переключиться на облачную БД?**

A: В `config.dev.yml`:
```yaml
services:
  checkout:
    database_url: "${NEON_DATABASE_URL}"
```

И установите переменную окружения:
```bash
export NEON_DATABASE_URL="postgresql://..."
make dev:orchestrator
```

**Q: Как изменить log level?**

A: В `config.dev.yml`:
```yaml
vars:
  log_level: debug  # или info, warn, error
```

**Q: Где хранятся данные PostgreSQL?**

A: В Docker volume `services_postgres-dev-data`. Удалить:
```bash
docker volume rm services_postgres-dev-data
```

### Разработка

**Q: Как дебажить сервис в VSCode?**

A: Добавьте в `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Orchestrator",
  "runtimeExecutable": "yarn",
  "runtimeArgs": ["workspace", "@shopana/orchestrator-service", "run", "dev"],
  "env": {
    "CONFIG_FILE": "config.dev.yml"
  }
}
```

**Q: Как запустить тесты?**

A:
```bash
# Unit тесты
yarn test

# E2E тесты (требуется запущенная инфраструктура)
make dev:orchestrator  # В одном терминале
yarn test:e2e         # В другом терминале
```

**Q: Как добавить новый сервис?**

A:
1. Создайте сервис в `services/my-service/`
2. Добавьте в `config.dev.yml`:
```yaml
services:
  my-service:
    port: 10009
```
3. Добавьте команду в `Makefile`:
```makefile
dev\:my-service:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/my-service-service run dev
```
4. Добавьте в orchestrator (если нужно):
```yaml
services:
  orchestrator:
    services: [..., my-service]
```

### Production

**Q: Можно ли использовать для production?**

A: Нет! config.dev.yml только для локальной разработки. Для production используйте config.yml и Docker.

**Q: Как протестировать production-like окружение?**

A:
```bash
make dev:production-like
```

Это запустит всё в Docker с production конфигурацией.

### Platform и Apollo

**Q: Когда мне нужен Platform?**

A: Platform (Go сервисы) нужен когда вы работаете с:
- **CMS функциональностью** - проекты, пользователи, настройки
- **Валютами и i18n** - локализация, мультивалютность
- **Медиа файлами** - загрузка изображений, документов в S3/MinIO

Если работаете только с e-commerce (checkout, orders, inventory), Platform не нужен.

**Q: Что такое Media Service?**

A: Media Service - это Go-микросервис для:
- Загрузки файлов в S3 (MinIO)
- Управления медиа библиотекой
- Оптимизации изображений
- Генерации превью

Запуск: `cd platform && make media:start`

**Q: Зачем нужен Apollo Router?**

A: Apollo Router объединяет GraphQL subgraphs в единый endpoint:
- **Без Apollo**: Клиенты обращаются к каждому сервису отдельно
  - checkout: `localhost:10002/graphql`
  - orders: `localhost:10003/graphql`
  - apps: `localhost:10001/graphql`

- **С Apollo**: Один endpoint для всех запросов
  - `localhost:4000/graphql` (admin)
  - `localhost:4001/graphql` (storefront)

Нужен для frontend'а чтобы не управлять множеством endpoint'ов.

**Q: Platform использует ту же базу данных?**

A: Да! Platform и Node.js сервисы используют одну PostgreSQL базу `localhost:5432`, но разные схемы:
- Platform: `portal` schema
- Node.js: разные схемы для каждого сервиса

**Q: Нужно ли запускать Platform если я работаю с checkout/orders?**

A: Нет! Checkout и Orders работают независимо. Platform нужен только если:
- Нужны данные о проектах/пользователях из CMS
- Checkout/Orders делают gRPC вызовы к Platform
- Работаете с медиа файлами

---

## Что дальше?

### Ежедневная разработка

```bash
# Утром
make dev:status       # Проверить инфраструктуру
make dev:orchestrator # Запустить сервисы

# Разработка...
# Код автоматически перезагружается

# Вечером
Ctrl+C                # Остановить orchestrator
# Инфраструктура может работать постоянно
```

### Полезные ссылки

- Moleculer docs: https://moleculer.services/
- NATS docs: https://docs.nats.io/
- Apollo Federation: https://www.apollographql.com/docs/federation/

### Получить помощь

```bash
# Команды
make dev:help

# Статус
make dev:status

# Логи
make dev:logs
docker logs <container-name>

# Проверка здоровья
curl http://localhost:8222/healthz  # NATS
curl http://localhost:10001/        # Apps service
```

---

## Итоговая шпаргалка

```bash
# ЗАПУСК (каждый день)
make dev:orchestrator

# ОСТАНОВКА
Ctrl+C

# ПРОБЛЕМЫ
make dev:status          # Что запущено?
make dev:logs            # Что в логах?
lsof -i :3030           # Кто занял порт?
make dev:down            # Перезапустить всё
docker ps                # Что в Docker?

# ИНФРАСТРУКТУРА
docker-compose -f docker-compose.dev-infrastructure.yml ps
docker-compose -f docker-compose.dev-infrastructure.yml logs -f
docker-compose -f docker-compose.dev-infrastructure.yml restart <service>

# РАЗРАБОТКА
make build:packages      # Пересобрать shared packages
make dev:checkout        # Запустить checkout отдельно
CONFIG_FILE=config.dev.yml  # Всегда используется через Makefile
```

---

**Система готова! Удачной разработки! 🚀**
