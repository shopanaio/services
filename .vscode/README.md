# VSCode Configuration

Готовая конфигурация VSCode для разработки с NestJS Orchestrator.

## Quick Start

### 🚀 Запустить всё одной кнопкой

**Нажмите `Cmd + Shift + B`** (macOS) или **`Ctrl + Shift + B`** (Windows/Linux)

Это запустит задачу "🚀 Start Local Dev (NestJS)" которая:
1. ✅ Запустит Docker (PostgreSQL + MinIO)
2. ✅ Дождется готовности сервисов
3. ✅ Запустит NestJS Orchestrator с `config.local.yml`
4. ✅ Загрузит все 7 сервисов в один процесс:
   - apps (port 10001)
   - checkout (port 10002)
   - orders (port 10003)
   - delivery
   - inventory
   - payments
   - pricing

### 🐛 Отладка

**Нажмите `F5`** для запуска отладки

Выберите:
- **🐛 Debug NestJS Orchestrator** - отладка с запуском
- **🚀 Start & Debug Local Dev** - всё вместе (infrastructure + debug)

## Файлы конфигурации

### `tasks.json` - Задачи

Все доступные задачи для запуска, сборки и управления.

**Основные задачи:**
- 🚀 Start Local Dev (NestJS) ⭐ (default)
- 🛑 Stop Local Dev
- 🗑️ Clean Local Dev (with volumes)
- 🔨 Build All Packages
- 📊 View Logs: PostgreSQL
- 📊 View Logs: MinIO

**Запустить задачу:**
- `Cmd/Ctrl + Shift + P` → "Run Task"
- Выбрать нужную задачу

### `launch.json` - Отладка

Конфигурации для отладки orchestrator и тестов.

**Доступные конфигурации:**
- 🐛 Debug NestJS Orchestrator
- 🐛 Debug Orchestrator (Moleculer)
- 🐛 Attach to NestJS Orchestrator
- 🧪 Debug Current Test File

**Compound:**
- 🚀 Start & Debug Local Dev - запускает infrastructure и отладку вместе

### `settings.json` - Настройки

Оптимизированные настройки для разработки:

- ✅ TypeScript SDK указан на локальную версию
- ✅ Auto-import с относительными путями
- ✅ Format on save (Prettier)
- ✅ Fix ESLint on save
- ✅ Organize imports on save
- ✅ Исключения для поиска и файлового наблюдателя
- ✅ Словарь для spell checker

## Горячие клавиши

| Действие | Shortcut (macOS) | Shortcut (Win/Linux) |
|----------|------------------|----------------------|
| Run Build Task | `Cmd + Shift + B` | `Ctrl + Shift + B` |
| Run Any Task | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| Start Debugging | `F5` | `F5` |
| Stop Debugging | `Shift + F5` | `Shift + F5` |
| Toggle Breakpoint | `F9` | `F9` |
| Step Over | `F10` | `F10` |
| Step Into | `F11` | `F11` |
| Step Out | `Shift + F11` | `Shift + F11` |

## Использование

### Сценарий 1: Первый запуск

```
1. Открыть проект в VSCode
2. Нажать Cmd + Shift + B
3. Дождаться запуска
4. Открыть http://localhost:10001/graphql
```

### Сценарий 2: Отладка

```
1. Открыть файл сервиса (например, services/checkout/src/service.ts)
2. Поставить breakpoint (F9)
3. Нажать F5
4. Выбрать "🐛 Debug NestJS Orchestrator"
5. Сделать GraphQL запрос
6. Debugger остановится на breakpoint
```

### Сценарий 3: Просмотр логов

```
1. Cmd + Shift + P
2. "Run Task"
3. Выбрать "📊 View Logs: PostgreSQL" или "📊 View Logs: MinIO"
```

### Сценарий 4: Очистка

```
1. Cmd + Shift + P
2. "Run Task"
3. Выбрать "🗑️ Clean Local Dev (with volumes)"
```

## Tips

### 1. Multiple terminals

Все задачи открываются в отдельных терминалах для удобства.

### 2. Hot reload

NestJS Orchestrator использует `tsx watch` - изменения подхватываются автоматически.

### 3. Debug Console

Во время отладки можно выполнять код в Debug Console:
```javascript
ctx.params
ctx.broker.getService('inventory')
```

### 4. Breakpoints в TypeScript

Source maps настроены - breakpoints работают в `.ts` файлах.

### 5. Spell checker

В `settings.json` добавлены слова в словарь - меньше красных подчеркиваний.

## Требования

### Обязательные расширения

- **TypeScript** (встроено)
- **Prettier** - форматирование кода
  ```
  ext install esbenp.prettier-vscode
  ```

### Рекомендуемые расширения

- **ESLint** - линтинг
  ```
  ext install dbaeumer.vscode-eslint
  ```

- **Docker** - управление контейнерами
  ```
  ext install ms-azuretools.vscode-docker
  ```

- **GraphQL** - подсветка синтаксиса
  ```
  ext install graphql.vscode-graphql
  ```

- **YAML** - работа с config файлами
  ```
  ext install redhat.vscode-yaml
  ```

## Customization

### Добавить свою задачу

Отредактируйте `tasks.json`:

```json
{
  "label": "My Task",
  "type": "shell",
  "command": "echo 'Hello'",
  "group": "build"
}
```

### Изменить default task

В `tasks.json` найдите нужную задачу и добавьте:

```json
"group": {
  "kind": "build",
  "isDefault": true
}
```

### Добавить debug configuration

Отредактируйте `launch.json`:

```json
{
  "name": "My Debug Config",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/my-script.js"
}
```

## Troubleshooting

### Task не запускается

**Проблема:** Task показывает ошибку "shell not found"

**Решение:** Проверьте что `/bin/zsh` существует:
```bash
which zsh
```

Если zsh не установлен, измените в tasks.json:
```json
"shell": {
  "executable": "/bin/bash"
}
```

### nvm команда не найдена

**Проблема:** Task показывает "nvm: command not found"

**Решение:** Убедитесь что nvm настроен в `~/.zshrc`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### Breakpoints не работают

**Проблема:** Debugger не останавливается на breakpoints

**Решение:**
1. Проверьте что TypeScript компилируется с source maps
2. Перезапустите отладку (Shift+F5, затем F5)
3. Проверьте что файл не в `skipFiles`

### Docker контейнеры не запускаются

**Проблема:** Task показывает "Cannot connect to Docker daemon"

**Решение:**
1. Запустите Docker Desktop
2. Проверьте: `docker ps`
3. Перезапустите задачу

## Архитектура

### NestJS Orchestrator

NestJS Orchestrator запускает все сервисы в **одном процессе Node.js**:

```
┌─────────────────────────────────────────┐
│     NestJS Orchestrator (PID 44159)     │
│  ┌─────────────────────────────────┐   │
│  │   NestBroker (In-process)       │   │
│  ├─────────────────────────────────┤   │
│  │  ServiceAdapter: apps           │   │
│  │  ServiceAdapter: checkout       │   │
│  │  ServiceAdapter: orders         │   │
│  │  ServiceAdapter: delivery       │   │
│  │  ServiceAdapter: inventory      │   │
│  │  ServiceAdapter: payments       │   │
│  │  ServiceAdapter: pricing        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Преимущества:**
- ⚡ Zero latency - прямые вызовы методов
- 🔧 Проще отладка - все в одном процессе
- 📦 Меньше ресурсов - один Node.js процесс
- 🚀 Быстрый старт - нет сетевых соединений

**Конфигурация:**
- Список сервисов: `config.local.yml` → `services.orchestrator.services`
- Загрузчик: `services/orchestrator/src/nest-orchestrator.ts`
- Адаптеры: `packages/shared-kernel/src/nestjs/ServiceSchemaAdapter.ts`

## Документация

Подробная документация:
- [VSCode Tasks](../docs/vscode-tasks.md) - полное описание всех задач
- [Local Development](../docs/local-development.md) - гайд по локальной разработке
- [NestJS Migration](../docs/nestjs-migration-plan.md) - архитектура
- [NestJS Orchestrator](../docs/nestjs-orchestrator.md) - детальное описание оркестратора

## Что дальше?

1. **Запустите проект:** `Cmd + Shift + B`
2. **Попробуйте отладку:** `F5`
3. **Посмотрите логи:** Run Task → "📊 View Logs"
4. **Изучите документацию:** [docs/vscode-tasks.md](../docs/vscode-tasks.md)

Готово! 🚀
