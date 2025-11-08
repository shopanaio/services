# Изменения - Локальная Разработка

## Что было сделано

Создана полноценная система локальной разработки для Shopana microservices.

## Новые файлы (17)

### Конфигурация
- `config.dev.yml` - Конфигурация для локальной разработки (localhost)
- `.env` - Переменные окружения

### Docker Compose
- `docker-compose.dev-infrastructure.yml` - Инфраструктура (NATS, PostgreSQL, MinIO)
- `docker-compose.dev-services.yml` - Сервисы с profiles

### Ansible Playbooks
- `ansible/playbooks/local-dev/dev-up.yml`
- `ansible/playbooks/local-dev/dev-down.yml`
- `ansible/playbooks/local-dev/README.md`
- `ansible/playbooks/local-dev/vars/dev.yml`
- `ansible/playbooks/local-dev/vars/preset-minimal.yml`
- `ansible/playbooks/local-dev/vars/preset-fullstack.yml`
- `ansible/playbooks/local-dev/vars/preset-production-like.yml`
- `ansible/playbooks/local-dev/templates/start-local-services.sh.j2`
- `ansible/playbooks/local-dev/templates/start-platform.sh.j2`

### Документация
- `START_HERE.md` - Быстрый старт
- `LOCAL_DEV_SETUP.md`
- `SETUP_COMPLETE.md`
- `docs/LOCAL_DEVELOPMENT_RU.md`
- `docs/LOCAL_DEVELOPMENT_QUICKSTART.md`

## Изменённые файлы (3)

### Поддержка CONFIG_FILE
- `packages/shared-service-config/src/configLoader.ts`
  - Добавлена переменная окружения CONFIG_FILE
  - Позволяет выбирать config файл (config.yml или config.dev.yml)

### Makefile команды
- `Makefile`
  - Добавлены: `dev:up`, `dev:down`, `dev:status`, `dev:logs`, `dev:help`
  - Добавлены: `dev:minimal`, `dev:fullstack`, `dev:production-like`
  - Все `dev:*` команды используют `CONFIG_FILE=config.dev.yml`

### Docker Compose Services  
- `docker-compose.dev-services.yml`
  - Удалены `depends_on: nats` (так как nats в отдельном compose файле)

## Как работает

1. **Инфраструктура** запускается в Docker:
   ```bash
   docker-compose -f docker-compose.dev-infrastructure.yml up -d
   ```

2. **Сервисы** запускаются локально с `config.dev.yml`:
   ```bash
   make dev:orchestrator  # или любой другой сервис
   ```

3. **CONFIG_FILE** автоматически указывает на `config.dev.yml`, который использует `localhost` вместо Docker имен

## Что решает

- ✅ Гибкое управление сервисами (локально или Docker)
- ✅ Быстрый старт инфраструктуры
- ✅ Hot reload для локальных сервисов
- ✅ Готовые пресеты для разных режимов
- ✅ Ansible автоматизация
- ✅ Полная документация

## Запуск

```bash
# Быстрый старт
make dev:status        # Проверить инфраструктуру
make dev:orchestrator  # Запустить сервисы

# Документация
cat START_HERE.md
```

## Тестирование

✅ Инфраструктура запущена и работает  
✅ Orchestrator успешно запускается  
✅ Все 5 сервисов загружаются (apps, delivery, inventory, payments, pricing)  
✅ Подключение к NATS, PostgreSQL, MinIO работает  

---

**Дата**: 2025-11-08  
**Статус**: ✅ Готово и протестировано
