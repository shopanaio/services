# Development Environment Setup

## Архитектура сервисов

Проект состоит из двух типов сервисов:

### 1. Orchestrator (Node.js/Moleculer)
- **Порты**: 10001 (GraphQL), 3030 (Metrics)
- **Сервисы**: apps, delivery, inventory, payments, pricing
- **Требует интерактивный терминал** (использует REPL для отладки)

### 2. Platform Services (Go)

**ВАЖНО:** Запускаются НОВЫЕ микросервисы из `platform/services/`, а не старый монолит из `platform/monolith/`!

Структура:
```
platform/
├── monolith/         ← Старый монолит (НЕ используется)
└── services/         ← НОВЫЕ микросервисы (используются!)
    ├── project/      ← CMS микросервис (users, currencies, i18n)
    └── media/        ← Файловый сервис
```

Запущенные сервисы:
- **Project Service** (NEW): 8000 (HTTP/GraphQL), 50051 (gRPC)
  - Путь: `platform/services/project/cmd/main.go`
- **Media Service** (NEW): 8081 (HTTP), 50052 (gRPC)
  - Путь: `platform/services/media/cmd/main.go`

## Быстрый старт

### Вариант 1: Два терминала (рекомендуется)

**Терминал 1 - Orchestrator:**
```bash
cd /Users/phl/Projects/shopana-io/services
make dev:orchestrator
```

**Терминал 2 - Platform Services:**
```bash
cd /Users/phl/Projects/shopana-io/services
make dev:new
```

### Вариант 2: Один терминал с tmux

```bash
# Запустить orchestrator в фоновой tmux сессии
tmux new -d -s orchestrator "cd /Users/phl/Projects/shopana-io/services && make dev:orchestrator"

# Запустить platform сервисы в текущем терминале
make dev:new

# Посмотреть логи orchestrator:
tmux attach -t orchestrator
```

### Вариант 3: Один терминал с screen

```bash
# Запустить orchestrator в screen
screen -dmS orchestrator bash -c "cd /Users/phl/Projects/shopana-io/services && make dev:orchestrator"

# Запустить platform сервисы
make dev:new

# Посмотреть orchestrator:
screen -r orchestrator
```

## Доступные эндпоинты

После запуска всех сервисов доступны:

- **Orchestrator GraphQL**: http://localhost:10001/graphql
- **Orchestrator Health**: http://localhost:10001/
- **Orchestrator Metrics**: http://localhost:3030/metrics
- **Project GraphQL**: http://localhost:8000/api/admin/graphql/query
- **Project gRPC**: localhost:50051
- **Media HTTP**: http://localhost:8081
- **Media gRPC**: localhost:50052

## Логи

Логи сервисов сохраняются в `/tmp`:

```bash
# Orchestrator
tail -f /tmp/orchestrator.log

# Project Service
tail -f /tmp/platform-project.log

# Media Service
tail -f /tmp/platform-media.log
```

## Остановка сервисов

```bash
# Остановить Platform Services (в терминале где запущен make dev:new)
Ctrl+C

# Остановить Orchestrator (в терминале где запущен make dev:orchestrator)
Ctrl+C

# Или остановить tmux/screen сессию:
tmux kill-session -t orchestrator
# или
screen -X -S orchestrator quit
```

## Troubleshooting

### PostgreSQL: "too many clients already"

Если видите ошибку о слишком большом количестве подключений:

```bash
docker restart shopana-postgres-dev
sleep 5  # Подождать пока PostgreSQL запустится
```

### Порты заняты

Проверить какие процессы используют порты:

```bash
lsof -i :10001  # Orchestrator GraphQL
lsof -i :3030   # Metrics
lsof -i :8000   # Project Service
lsof -i :8081   # Media Service
```

Освободить порт:

```bash
./scripts/kill-port.sh <PORT>
```

### Инфраструктура не запущена

Запустить Docker инфраструктуру (PostgreSQL, NATS, MinIO):

```bash
make dev:infra
```

Проверить статус:

```bash
docker ps | grep shopana
```

Должны быть запущены:
- `shopana-postgres-dev` (healthy)
- `shopana-nats-dev`
- `shopana-minio-dev`

## Полезные команды

```bash
# Запустить только orchestrator
make dev:orchestrator

# Запустить только platform services
make dev:new

# Запустить инфраструктуру
make dev:infra

# Билд всех сервисов
make build

# Билд конкретного сервиса
make build service=apps
```

## Переменные окружения

### Project Service
Использует `.env.dev`:
- `PLATFORM_PORT=8000`
- `PLATFORM_DB_HOST=localhost`
- `S3_ENDPOINT=localhost:9000`
- `S3_BUCKET=shopana-sandbox`

### Media Service
Использует `.env.media`:
- `PLATFORM_PORT=8081`
- `PLATFORM_DB_HOST=localhost`
- `S3_ENDPOINT=localhost:9000`
- `S3_BUCKET=shopana-media`

### Orchestrator
Использует `config.dev.yml`:
- Environment: development
- Services: apps, delivery, inventory, payments, pricing
- Transporter: nats://localhost:4222

---

## 🔀 Старый vs Новый Platform

### Старый монолит (platform/monolith/)
**НЕ запускается** командой `make dev:new`

**По умолчанию требует Casdoor** (порт 9011) - при старте пытается загрузить сертификаты и падает с паникой если Casdoor недоступен.

Если нужен старый монолит:
```bash
# Запустить инфраструктуру + Casdoor
make dev:infra

# Запустить старый монолит
make dev:platform
```

### Новые микросервисы (platform/services/)
**Запускаются** командой `make dev:new` или `make dev:auto`

Автономные сервисы, не требуют Casdoor:
- `platform/services/project/` - CMS микросервис
- `platform/services/media/` - Файловый сервис

Проверить какие сервисы запущены:
```bash
ps aux | grep "go run" | grep -v grep

# Вывод покажет путь:
# go run services/project/cmd/main.go  ← NEW из services/
# go run services/media/cmd/main.go    ← NEW из services/
```
