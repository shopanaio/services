# VSCode Tasks & Debugging

Все настроенные задачи и отладка для быстрой разработки.

## Quick Start

### Запустить все (один клик)

**Cmd + Shift + B** (или **Cmd + Shift + P** → "Run Build Task")

Запустит задачу по умолчанию: **🚀 Start Local Dev (NestJS)**

Это запустит:
1. Docker containers (PostgreSQL + MinIO)
2. NestJS Orchestrator со всеми сервисами

### Остановить все

**Cmd + Shift + P** → "Run Task" → **🛑 Stop Local Dev**

## Доступные задачи

### 🚀 Основные задачи

#### 🚀 Start Local Dev (NestJS) ⭐ (Default)
Полный запуск локальной разработки:
- Запускает Docker infrastructure
- Ждет готовности PostgreSQL и MinIO
- Запускает NestJS Orchestrator

**Как запустить:**
- `Cmd + Shift + B`
- Или: Terminal → Run Build Task

#### 🛑 Stop Local Dev
Останавливает локальную инфраструктуру (Docker containers)

#### 🗑️ Clean Local Dev (with volumes)
Останавливает и удаляет все данные (volumes)

### 🔨 Сборка

#### 🔨 Build All Packages
Собирает все пакеты:
- @shopana/shared-kernel
- @shopana/shared-service-api
- @shopana/shared-service-config
- @shopana/orchestrator-service

### 📊 Логи

#### 📊 View Logs: PostgreSQL
Показывает логи PostgreSQL в реальном времени

#### 📊 View Logs: MinIO
Показывает логи MinIO в реальном времени

### 🔧 Дополнительные задачи

#### Start NestJS Orchestrator
Запускает только orchestrator (без infrastructure)

**Environment:**
- `NODE_ENV=development`
- `CONFIG_FILE=config.local.yml`

#### Start Orchestrator (Moleculer)
Запускает orchestrator в режиме Moleculer (legacy)

#### Start All Dev Services (Legacy)
Старый способ запуска с Platform Service

## Отладка (Debugging)

### 🐛 Debug NestJS Orchestrator

Запускает orchestrator в режиме отладки.

**Как использовать:**
1. Запустите инфраструктуру: Run Task → "Start Local Infrastructure"
2. Нажмите **F5** или Run → Start Debugging
3. Выберите "🐛 Debug NestJS Orchestrator"

**Breakpoints:**
- Ставьте breakpoints в service files
- Отладка работает в режиме hot reload
- Поддерживает TypeScript source maps

### 🐛 Debug Orchestrator (Moleculer)

Отладка в режиме Moleculer (для сравнения).

### 🐛 Attach to NestJS Orchestrator

Подключение к уже запущенному orchestrator.

**Как использовать:**
1. Запустите orchestrator с флагом inspect:
   ```bash
   node --inspect=9229 dist/src/nest-orchestrator.js
   ```
2. Нажмите **F5** → "🐛 Attach to NestJS Orchestrator"

### 🧪 Debug Current Test File

Отладка текущего тест-файла в Vitest.

**Как использовать:**
1. Откройте тест-файл (*.test.ts)
2. Поставьте breakpoint
3. **F5** → "🧪 Debug Current Test File"

### 🚀 Start & Debug Local Dev (Compound)

Запускает infrastructure и сразу отладку orchestrator.

**Как использовать:**
- **F5** → "🚀 Start & Debug Local Dev"

## Shortcuts

| Действие | Shortcut |
|----------|----------|
| Run Build Task | `Cmd + Shift + B` |
| Run Any Task | `Cmd + Shift + P` → "Run Task" |
| Start Debugging | `F5` |
| Stop Debugging | `Shift + F5` |
| Toggle Breakpoint | `F9` |
| Step Over | `F10` |
| Step Into | `F11` |
| Step Out | `Shift + F11` |

## Типичные сценарии

### Scenario 1: Начало работы

1. **Запустить все:**
   ```
   Cmd + Shift + B
   ```

2. **Дождаться готовности:**
   - ✅ PostgreSQL ready
   - ✅ MinIO ready
   - ✅ NestJS Orchestrator started

3. **Начать работу:**
   - Открыть GraphQL: http://localhost:10001/graphql
   - Проверить метрики: http://localhost:3030/metrics

### Scenario 2: Отладка сервиса

1. **Запустить infrastructure:**
   ```
   Cmd + Shift + P → "Run Task" → "Start Local Infrastructure"
   ```

2. **Открыть service file:**
   ```typescript
   // services/checkout/src/service.ts
   ```

3. **Поставить breakpoint:**
   - В любом action handler
   - Например, в `getById` action

4. **Запустить отладку:**
   ```
   F5 → "🐛 Debug NestJS Orchestrator"
   ```

5. **Сделать запрос:**
   ```bash
   curl http://localhost:10002/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ checkouts { id } }"}'
   ```

6. **Debugger остановится** на вашем breakpoint!

### Scenario 3: Сравнение NestJS vs Moleculer

1. **Запустить NestJS:**
   ```
   Cmd + Shift + P → "Run Task" → "Start NestJS Orchestrator"
   ```

2. **Проверить производительность:**
   ```bash
   curl http://localhost:3030/metrics | grep call_duration
   ```

3. **Остановить (Ctrl+C)**

4. **Запустить Moleculer:**
   ```
   Cmd + Shift + P → "Run Task" → "Start Orchestrator (Moleculer)"
   ```

5. **Сравнить метрики**

### Scenario 4: Очистка и перезапуск

1. **Остановить все:**
   ```
   Cmd + Shift + P → "Run Task" → "🛑 Stop Local Dev"
   ```

2. **Очистить данные:**
   ```
   Cmd + Shift + P → "Run Task" → "🗑️ Clean Local Dev (with volumes)"
   ```

3. **Пересобрать пакеты:**
   ```
   Cmd + Shift + P → "Run Task" → "🔨 Build All Packages"
   ```

4. **Запустить снова:**
   ```
   Cmd + Shift + B
   ```

## Troubleshooting

### Task не запускается

1. **Проверьте shell:**
   - Tasks используют `/bin/zsh`
   - Убедитесь что zsh установлен

2. **Проверьте nvm:**
   - Tasks используют `nvm use 22`
   - Убедитесь что nvm настроен в ~/.zshrc

### Orchestrator не стартует

1. **Проверьте Docker:**
   ```bash
   docker ps | grep shopana
   ```

2. **Проверьте логи:**
   ```
   Cmd + Shift + P → "Run Task" → "📊 View Logs: PostgreSQL"
   ```

3. **Пересоберите пакеты:**
   ```
   Cmd + Shift + P → "Run Task" → "🔨 Build All Packages"
   ```

### Breakpoints не работают

1. **Проверьте source maps:**
   - Убедитесь что tsconfig имеет `"sourceMap": true`

2. **Проверьте skipFiles:**
   - В launch.json должно быть:
     ```json
     "skipFiles": [
       "<node_internals>/**",
       "**/node_modules/**"
     ]
     ```

3. **Перезапустите отладку:**
   - `Shift + F5` (stop)
   - `F5` (start)

## Tips & Tricks

### 1. Multiple Panels

Открыть несколько терминалов параллельно:
- `Cmd + Shift + P` → "Run Task"
- Выберите несколько задач
- Каждая откроется в отдельной панели

### 2. Terminal Split

Разделить терминал:
- `Cmd + \` - split terminal
- `Cmd + ]` / `Cmd + [` - переключение между панелями

### 3. Task Output

Очистить output:
- В терминале: `Cmd + K`

### 4. Quick Task Run

Быстрый запуск последней задачи:
- `Cmd + Shift + P` → "Rerun Last Task"

### 5. Debug Console

Выполнить код в Debug Console:
- Во время отладки открыть Debug Console
- Ввести любой JavaScript/TypeScript код
- Доступны все переменные из scope

Example:
```javascript
// В Debug Console во время breakpoint
console.log(ctx.params)
ctx.broker.getService('inventory')
```

## Customization

### Добавить свою задачу

Отредактируйте `.vscode/tasks.json`:

```json
{
  "label": "My Custom Task",
  "type": "shell",
  "command": "echo 'Hello'",
  "options": {
    "cwd": "${workspaceFolder}",
    "shell": {
      "executable": "/bin/zsh",
      "args": ["-c"]
    }
  },
  "group": "build",
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "dedicated"
  }
}
```

### Изменить default task

В `.vscode/tasks.json` найдите задачу и добавьте:

```json
"group": {
  "kind": "build",
  "isDefault": true
}
```

## См. также

- [Local Development](./local-development.md) - Полная документация
- [NestJS Migration Plan](./nestjs-migration-plan.md) - Архитектура
- [Testing Guide](./testing.md) - Как писать тесты
