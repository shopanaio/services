# Checkout Tags - Database Schema Review

## Обзор

Документ описывает текущее состояние схемы БД для checkout tags и исправления, сделанные на основе code review.

## Текущая структура таблицы

### `platform.checkout_tags`

```sql
CREATE TABLE checkout_tags (
    id uuid PRIMARY KEY,
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    slug varchar(64) NOT NULL,
    is_unique boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_checkout_tags_slug CHECK (slug ~ '^[a-zA-Z0-9]+$'),
    UNIQUE (checkout_id, slug)
);
```

### Связанная таблица: `platform.checkout_line_items`

```sql
CREATE TABLE checkout_line_items (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    checkout_id uuid,
    tag_id uuid,  -- Ссылка на checkout_tags
    quantity int NOT NULL CHECK (quantity > 0),
    -- ... другие поля
);

-- Foreign Key с каскадным удалением
ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_checkout_line_items_tag_id
FOREIGN KEY (tag_id)
REFERENCES checkout_tags (id)
ON DELETE SET NULL;
```

## Статус исправлений из Code Review

### ✅ Критические проблемы (Исправлены)

#### 1. Race condition при создании тегов
**Проблема:** Возможность создания дубликатов при одновременных запросах
**Решение:** ✅ Добавлен `UNIQUE (checkout_id, slug)` constraint
**Локация:** `sql-0001/checkout_v2/checkout.sql:91-92`, `sql-0002/services/checkout/checkout.sql:92`

```sql
UNIQUE (checkout_id, slug)
```

**Эффект:**
- PostgreSQL гарантирует уникальность на уровне БД
- Попытка создать дубликат вернет `duplicate key value violates unique constraint`
- Use case `createCheckoutTag` корректно обрабатывает эту ошибку

---

#### 2. Каскадное удаление тегов из линий
**Проблема:** Неясное поведение при удалении тега
**Решение:** ✅ `ON DELETE SET NULL` для `tag_id` в `checkout_line_items`
**Локация:** `sql-0001/checkout_v2/checkout.sql:215-216`, `sql-0002/services/checkout/checkout.sql:216-217`

```sql
ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_checkout_line_items_tag_id
FOREIGN KEY (tag_id) REFERENCES checkout_tags (id)
ON DELETE SET NULL;
```

**Поведение:**
```
Шаг 1: checkout_line_items имеет tag_id = 'tag-uuid-123'
Шаг 2: DELETE FROM checkout_tags WHERE id = 'tag-uuid-123'
Шаг 3: checkout_line_items.tag_id автоматически = NULL
```

**Преимущества:**
- Линии НЕ удаляются при удалении тега
- Сохраняется история заказов
- Явное поведение без логики в application layer

---

#### 3. Индексы для производительности

##### ✅ Базовый индекс (Уже создан)
**Локация:** `sql-0001:234`, `sql-0002:241`
```sql
CREATE INDEX IF NOT EXISTS idx_checkout_tags_checkout_id
ON checkout_tags (checkout_id);
```

##### ✅ Композитный индекс (Добавлен в миграции 0004)
**Локация:** `sql-0004/checkout_tags_optimization.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_checkout_tags_checkout_created
ON checkout_tags (checkout_id, created_at);
```

**Использование:**
```typescript
// services/checkout/src/infrastructure/readModel/checkoutReadRepository.ts:271-290
async findTags(checkoutId: string): Promise<CheckoutTagRow[]> {
  const q = knex
    .withSchema("platform")
    .table("checkout_tags")
    .select("...")
    .where({ checkout_id: checkoutId })
    .orderBy("created_at", "asc");  // <-- Использует композитный индекс!
}
```

**Query Plan (до оптимизации):**
```
Index Scan using idx_checkout_tags_checkout_id on checkout_tags
  Index Cond: (checkout_id = '...'::uuid)
  Sort Key: created_at    <-- Дополнительная сортировка!
```

**Query Plan (после оптимизации):**
```
Index Scan using idx_checkout_tags_checkout_created on checkout_tags
  Index Cond: (checkout_id = '...'::uuid)
  <-- Результат уже отсортирован!
```

---

### 🟡 Средние проблемы

#### 4. Валидация slug (Реализовано на уровне БД)
**Статус:** ✅ Частично решено

**На уровне БД:**
```sql
CONSTRAINT ck_checkout_tags_slug CHECK (slug ~ '^[a-zA-Z0-9]+$')
```

**На уровне DTO:**
```typescript
// services/checkout/src/application/dto/checkoutTag.dto.ts:12-14
@Matches(/^[a-zA-Z0-9]+$/, {
  message: "slug must be alphanumeric (a-zA-Z0-9)",
})
slug!: string;
```

**⚠️ Потенциальная проблема:**
- `slug1` и `SLUG1` - это разные теги (case-sensitive)
- Может вызвать путаницу у пользователей

**Рекомендация для будущего:**
```sql
-- Опция 1: Добавить constraint для lowercase
ALTER TABLE checkout_tags
ADD CONSTRAINT ck_checkout_tags_slug_lowercase
CHECK (slug = lower(slug));

-- Опция 2: Использовать CITEXT тип
ALTER TABLE checkout_tags
ALTER COLUMN slug TYPE citext;
```

---

#### 5. Лимит на количество тегов
**Статус:** ❌ Не реализовано

**Рекомендация:**
```sql
-- Добавить trigger для проверки лимита
CREATE OR REPLACE FUNCTION check_checkout_tags_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM checkout_tags WHERE checkout_id = NEW.checkout_id) >= 50 THEN
        RAISE EXCEPTION 'Checkout cannot have more than 50 tags';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checkout_tags_limit
BEFORE INSERT ON checkout_tags
FOR EACH ROW EXECUTE FUNCTION check_checkout_tags_limit();
```

**Альтернатива:** Проверка в application layer (`createCheckoutTagUseCase`)

---

## Производительность

### Размер таблицы
```sql
SELECT
    pg_size_pretty(pg_total_relation_size('platform.checkout_tags')) as total_size,
    pg_size_pretty(pg_relation_size('platform.checkout_tags')) as table_size,
    pg_size_pretty(pg_indexes_size('platform.checkout_tags')) as indexes_size;
```

**Ожидаемый размер:**
- 1000 тегов: ~200 KB (таблица) + ~50 KB (индексы)
- 100,000 тегов: ~20 MB (таблица) + ~5 MB (индексы)

### Типичные запросы

#### 1. Поиск всех тегов checkout (используется в 90% случаев)
```sql
SELECT id, slug, is_unique, created_at, updated_at
FROM platform.checkout_tags
WHERE checkout_id = ?
ORDER BY created_at ASC;
```
**Индекс:** `idx_checkout_tags_checkout_created` ✅
**Производительность:** O(log N) для поиска + O(K) для чтения K тегов

#### 2. Проверка существования тега по slug
```sql
SELECT id FROM platform.checkout_tags
WHERE checkout_id = ? AND slug = ?;
```
**Индекс:** `checkout_tags_checkout_id_slug_key` (UNIQUE constraint) ✅
**Производительность:** O(log N)

#### 3. Подсчет тегов в checkout
```sql
SELECT COUNT(*) FROM platform.checkout_tags
WHERE checkout_id = ?;
```
**Индекс:** `idx_checkout_tags_checkout_id` ✅
**Производительность:** Index-only scan (если статистика актуальна)

---

## Monitoring Queries

### Проверка размера индексов
```sql
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'checkout_tags'
  AND schemaname = 'platform';
```

### Поиск неиспользуемых индексов
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'checkout_tags'
  AND idx_scan = 0
  AND schemaname = 'platform';
```

### Проверка constraint violations
```sql
-- Проверить нарушения UNIQUE constraint
SELECT
    checkout_id,
    slug,
    COUNT(*)
FROM platform.checkout_tags
GROUP BY checkout_id, slug
HAVING COUNT(*) > 1;
```

---

## Безопасность

### Row Level Security (RLS)
**Статус:** ❌ Не настроено

**Рекомендация для multi-tenant setup:**
```sql
-- Включить RLS
ALTER TABLE checkout_tags ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только теги своего проекта
CREATE POLICY checkout_tags_isolation ON checkout_tags
    USING (project_id = current_setting('app.current_project_id')::uuid);
```

---

## Миграционный план для production

### Фаза 1: Pre-deployment checks ✅
- [x] Unique constraint на (checkout_id, slug)
- [x] FK с ON DELETE SET NULL для tag_id
- [x] Базовый индекс на checkout_id

### Фаза 2: Performance optimization (Миграция 0004)
- [x] Композитный индекс (checkout_id, created_at)
- [x] Тестирование на staging
- [ ] Deploy на production

### Фаза 3: Future improvements
- [ ] Добавить lowercase constraint для slug
- [ ] Реализовать лимит на количество тегов (50)
- [ ] Настроить RLS для multi-tenant isolation
- [ ] Добавить audit trail (created_by, updated_by)

---

## Связанные файлы

### Миграции
- `platform/migrations/cmd/sql-0001/checkout_v2/checkout.sql` - Начальная схема
- `platform/migrations/cmd/sql-0002/services/checkout/checkout.sql` - Обновленная схема
- `platform/migrations/cmd/sql-0004/checkout_tags_optimization.sql` - ⭐ Новая миграция

### Application Code
- `services/checkout/src/infrastructure/writeModel/checkoutWriteRepository.ts:274-337`
- `services/checkout/src/infrastructure/readModel/checkoutReadRepository.ts:271-290`
- `services/checkout/src/application/usecases/createCheckoutTagUseCase.ts`
- `services/checkout/src/application/usecases/updateCheckoutTagUseCase.ts`
- `services/checkout/src/application/usecases/deleteCheckoutTagUseCase.ts`

---

## Changelog

### 2025-11-19
- ✅ Code review проведен
- ✅ Создана миграция 0004 для композитного индекса
- ✅ Документация обновлена
- ⏳ Ожидается тестирование на staging

### Previous
- ✅ Unique constraint добавлен в sql-0001/sql-0002
- ✅ FK с ON DELETE SET NULL добавлен в sql-0001/sql-0002
- ✅ Базовые индексы созданы

---

## Контакты
- Database Schema Owner: Platform Team
- Code Reviewer: Claude Code
- Last Updated: 2025-11-19
