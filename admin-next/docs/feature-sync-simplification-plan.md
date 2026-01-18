# Feature Sync Simplification Plan

## Проблема

Текущий `FeaturesSyncScript` (~500 строк) слишком сложный из-за обхода unique constraints:
- Two-phase updates (offset + final)
- Temp slugs для избежания конфликтов
- Сложный порядок операций (UPDATE → DELETE vs DELETE → UPDATE)
- Много edge cases

## Решение

1. **Удалить slug из features** — name хранится в translations, slug избыточен
2. **Заменить unique constraints** на `DEFERRABLE` уникальность строкового `index`
3. **Упростить sync алгоритм** — DELETE лишние → UPSERT остальные
4. **Уточнить контракт и валидацию** — запретить неоднозначные типы и некорректные связи

---

## 1. Миграция БД

**Файл:** `services/inventory/migrations/0005_remove_feature_slug.sql`

```sql
-- 1. Убираем unique constraints на slug
ALTER TABLE inventory.product_feature
  DROP CONSTRAINT IF EXISTS product_feature_product_id_slug_key;

ALTER TABLE inventory.product_feature
  DROP CONSTRAINT IF EXISTS product_feature_slug_unique;

-- 2. Убираем partial unique indexes
DROP INDEX IF EXISTS inventory.product_feature_root_sort_idx;
DROP INDEX IF EXISTS inventory.product_feature_child_sort_idx;

-- 3. Добавляем index как int[]
ALTER TABLE inventory.product_feature
  ADD COLUMN index integer[] NOT NULL DEFAULT '{}';

-- 4. Уникальность index в рамках продукта (отложенная проверка)
ALTER TABLE inventory.product_feature
  ADD CONSTRAINT product_feature_product_id_index_uniq
    UNIQUE (product_id, index)
    DEFERRABLE INITIALLY DEFERRED;

-- 5. CHECK constraints для index
ALTER TABLE inventory.product_feature
  ADD CONSTRAINT feature_index_not_empty
    CHECK (array_length(index, 1) > 0);

ALTER TABLE inventory.product_feature
  ADD CONSTRAINT feature_group_root_only
    CHECK (is_group = false OR array_length(index, 1) = 1);

-- 6. Удаляем старую колонку sort_index
ALTER TABLE inventory.product_feature
  DROP COLUMN sort_index;

-- 7. Удаляем колонку slug
ALTER TABLE inventory.product_feature
  DROP COLUMN slug;

-- 8. Values: убираем slug, переименовываем sort_index → index
ALTER TABLE inventory.product_feature_value
  DROP CONSTRAINT IF EXISTS product_feature_value_feature_id_slug_key;

ALTER TABLE inventory.product_feature_value
  DROP CONSTRAINT IF EXISTS product_feature_value_slug_unique;

ALTER TABLE inventory.product_feature_value
  DROP COLUMN slug;

ALTER TABLE inventory.product_feature_value
  RENAME COLUMN sort_index TO index;
```

**Преимущества `int[]` над `text`:**
- Нативная сортировка PostgreSQL: `ORDER BY index` работает корректно
- Нет парсинга строк — `index[1:array_length(index,1)-1]` для parent
- GIN index для поиска по prefix (если нужно)
- Type safety — невозможно записать невалидные данные

---

## 2. Изменения в Drizzle модели

**Файл:** `services/inventory/src/repositories/models/features.ts`

```typescript
import {
  boolean,
  type AnyPgColumn,
  check,
  index,
  integer,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { product } from "./products";
import { inventorySchema } from "./schema";

export const productFeature = inventorySchema.table(
  "product_feature",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    index: integer("index").array().notNull(),  // int[] — tree position
    isGroup: boolean("is_group").notNull().default(false),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => productFeature.id,
      { onDelete: "cascade" }
    ),
  },
  (table) => [
    check(
      "feature_group_no_parent",
      sql`${table.isGroup} = false OR ${table.parentId} IS NULL`
    ),
    check(
      "feature_index_not_empty",
      sql`array_length(${table.index}, 1) > 0`
    ),
    check(
      "feature_group_root_only",
      sql`${table.isGroup} = false OR array_length(${table.index}, 1) = 1`
    ),
    index("product_feature_sort_idx").on(
      table.productId,
      table.index
    ),
    unique("product_feature_product_id_index_uniq").on(
      table.productId,
      table.index
    ),
  ]
);

export const productFeatureValue = inventorySchema.table(
  "product_feature_value",
  {
    id: uuid("id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => productFeature.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),  // position within feature: 0, 1, 2, ...
  },
  (table) => [
    index("idx_product_feature_value_feature_id").on(table.featureId),
  ]
);
```

**Что убрали:**
- `slug` из ProductFeature и ProductFeatureValue
- `sort_index` из ProductFeature → заменён на `index: int[]`
- `sort_index` из ProductFeatureValue → переименован в `index: int`
- Все unique constraints на slug
- Partial unique indexes

**Что добавили:**
- `index: integer[].notNull()` — tree position как массив
- `check("feature_index_not_empty")` — index не может быть пустым
- `check("feature_group_root_only")` — группы только на root (length = 1)
- `unique` на `(product_id, index)` — в миграции DEFERRABLE

**Что оставили:**
- `check("feature_group_no_parent")` — группы не могут иметь parent
- `index("idx_product_feature_value_feature_id")` — для JOIN

---

## 3. Изменения в GraphQL Schema

**Файл:** `services/inventory/src/api/graphql-admin/schema/features.graphql`

```graphql
"""A product feature represents either a group or an attribute."""
type ProductFeature implements Node @key(fields: "id") {
  id: ID!
  """Tree position as array: [0] for root, [0, 1] for child of first group."""
  index: [Int!]!
  isGroup: Boolean!
  name: String!           # из translations
  parent: ProductFeature
  children: [ProductFeature!]!
  values: [ProductFeatureValue!]!
}

input ProductFeatureSyncItemInput {
  """Database ID. Null for new records."""
  id: ID
  """
  Tree position as integer array.
  - [0], [1], [2] for root items
  - [0, 0], [0, 1], [1, 0] for children
  Parent is derived: parent of [0, 1] is [0].
  Groups must have length 1 (root only).
  """
  index: [Int!]!
  isGroup: Boolean!
  name: String!
  values: [ProductFeatureValueSyncInput!]
}

type ProductFeatureValue implements Node @key(fields: "id") {
  id: ID!
  index: Int!             # position: 0, 1, 2, ...
  name: String!           # из translations
}

input ProductFeatureValueSyncInput {
  """Database ID. Null for new records."""
  id: ID
  """Position within the feature's values (0, 1, 2, ...)"""
  index: Int!
  name: String!
}
```

**Убрано:**
- `slug` из ProductFeature и ProductFeatureValue

**Новый контракт `index`:**
- `[0]`, `[1]`, `[2]` — root items (группы или standalone атрибуты)
- `[0, 0]`, `[0, 1]`, `[1, 0]` — children (атрибуты внутри групп)
- Parent вычисляется: `[0, 1].slice(0, -1)` = `[0]`
- Группы: только `length === 1` (root level)
- Сортировка: нативная PostgreSQL `ORDER BY index`

---

## 4. Упрощённый FeaturesSyncScript

**Файл:** `services/inventory/src/scripts/feature/FeaturesSyncScript.ts`

```typescript
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { FeatureSyncParams, FeatureSyncResult } from "./dto/index.js";
import type { ValidatedFeatureInput, ValidatedValueInput } from "./validation/schema.js";
import { FeatureSyncInputSchema } from "./validation/schema.js";
import { validateSemantic, indexToKey, getParentIndex } from "./validation/semantic.js";
import { loadDbContext, validateDatabase } from "./validation/database.js";

interface ResolvedFeature {
  readonly index: number[];
  readonly input: ValidatedFeatureInput;
  readonly id: string;
  readonly parentId: string | null;
}

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {

  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    // ═══════════════════════════════════════════════════════════════════
    // Layer 1: Structural validation (Zod)
    // ═══════════════════════════════════════════════════════════════════
    const parseResult = FeatureSyncInputSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        product: undefined,
        features: [],
        userErrors: parseResult.error.issues.map((issue) => ({
          message: issue.message,
          field: issue.path.map(String),
          code: "VALIDATION_ERROR",
        })),
      };
    }
    const { productId, features } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════════
    // Product existence check
    // ═══════════════════════════════════════════════════════════════════
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // ═══════════════════════════════════════════════════════════════════
    // Layer 2: Semantic validation (sync, no DB)
    // ═══════════════════════════════════════════════════════════════════
    const semanticErrors = validateSemantic(features);
    if (semanticErrors.length > 0) {
      return { product: undefined, features: [], userErrors: semanticErrors };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Layer 3: Database validation (async, batch queries)
    // ═══════════════════════════════════════════════════════════════════
    const dbCtx = await loadDbContext(this.repository.feature, productId, features);
    const dbErrors = validateDatabase(features, dbCtx);
    if (dbErrors.length > 0) {
      return { product: undefined, features: [], userErrors: dbErrors };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sync: Delete → Create → Update
    // ═══════════════════════════════════════════════════════════════════
    const keepIds = features.flatMap((f) => (f.id ? [f.id] : []));
    await this.repository.feature.deleteExcept(productId, keepIds);

    const resolved = await this.resolveFeatures(productId, features);

    for (const item of resolved) {
      await this.upsertFeature(item);
    }

    for (const item of resolved) {
      if (!item.input.isGroup) {
        await this.syncValues(item.id, item.input.values ?? []);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Return result
    // ═══════════════════════════════════════════════════════════════════
    const [product, syncedFeatures] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.feature.findByProductId(productId),
    ]);

    return { product: product ?? undefined, features: syncedFeatures, userErrors: [] };
  }

  /**
   * Резолвит features: создаёт новые записи, разрешает parentId из index.
   */
  private async resolveFeatures(
    productId: string,
    features: ValidatedFeatureInput[]
  ): Promise<ResolvedFeature[]> {
    const indexKeyToDbId = new Map<string, string>();

    // Маппим существующие
    for (const f of features) {
      if (f.id) {
        indexKeyToDbId.set(indexToKey(f.index), f.id);
      }
    }

    // Создаём новые группы (root, без зависимостей)
    for (const f of features) {
      if (f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: true,
          parentId: null,
          index: f.index,
        });
        indexKeyToDbId.set(indexToKey(f.index), created.id);
      }
    }

    // Создаём новые атрибуты
    for (const f of features) {
      if (!f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: false,
          index: f.index,
          parentId: null,
        });
        indexKeyToDbId.set(indexToKey(f.index), created.id);
      }
    }

    // Собираем resolved с parentId
    return features.map((f) => {
      const parentIndex = getParentIndex(f.index);
      const parentId = parentIndex ? (indexKeyToDbId.get(indexToKey(parentIndex)) ?? null) : null;

      return {
        index: f.index,
        input: f,
        id: indexKeyToDbId.get(indexToKey(f.index))!,
        parentId,
      };
    });
  }

  private async upsertFeature(item: ResolvedFeature): Promise<void> {
    await this.repository.feature.update(item.id, {
      isGroup: item.input.isGroup,
      parentId: item.parentId,
      index: item.index,
    });

    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: item.id,
      locale: this.getLocale(),
      name: item.input.name,
    });
  }

  private async syncValues(featureId: string, values: ValidatedValueInput[]): Promise<void> {
    const keepIds = values.flatMap((v) => (v.id ? [v.id] : []));
    await this.repository.feature.deleteValuesExcept(featureId, keepIds);

    const sorted = [...values].sort((a, b) => a.index - b.index);

    for (const value of sorted) {
      let valueId: string;

      if (value.id) {
        await this.repository.feature.updateValue(featureId, value.id, { index: value.index });
        valueId = value.id;
      } else {
        const created = await this.repository.feature.createValue(featureId, { index: value.index });
        valueId = created.id;
      }

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: valueId,
        locale: this.getLocale(),
        name: value.name,
      });
    }
  }

  private error(message: string, field: string[], code: string): FeatureSyncResult {
    return { product: undefined, features: [], userErrors: [{ message, field, code }] };
  }

  protected handleError(_error: unknown): FeatureSyncResult {
    return this.error("Internal error", [], "INTERNAL_ERROR");
  }
}
```

**Что изменилось:**
- `index` теперь `number[]` вместо `string`
- Позиция внутри parent: `index[index.length - 1]`
- `indexToKey()` для использования массива как ключа Map
- `getParentIndex()` — просто `index.slice(0, -1)`
- Валидация вынесена в отдельные модули
- ~100 строк вместо ~500

---

## 5. Новые методы в Repository

**Файл:** `services/inventory/src/repositories/feature/FeatureRepository.ts`

```typescript
// Найти features по id и productId (для валидации принадлежности).
async findByIds(productId: string, ids: string[]): Promise<ProductFeature[]> {
  if (ids.length === 0) return [];
  return await this.db.select()
    .from(productFeature)
    .where(and(
      eq(productFeature.productId, productId),
      inArray(productFeature.id, ids)
    ));
}

// value ids по feature ids (для проверки принадлежности value → feature).
async findValueIdsByFeatureIds(featureIds: string[]): Promise<Map<string, string[]>> {
  if (featureIds.length === 0) return new Map();
  const rows = await this.db.select({
      id: productFeatureValue.id,
      featureId: productFeatureValue.featureId,
    })
    .from(productFeatureValue)
    .where(inArray(productFeatureValue.featureId, featureIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.featureId) ?? [];
    list.push(row.id);
    map.set(row.featureId, list);
  }
  return map;
}

// Удалить features кроме указанных ID
async deleteExcept(productId: string, keepIds: string[]): Promise<void> {
  if (keepIds.length === 0) {
    await this.db.delete(productFeature)
      .where(eq(productFeature.productId, productId));
  } else {
    await this.db.delete(productFeature)
      .where(and(
        eq(productFeature.productId, productId),
        notInArray(productFeature.id, keepIds)
      ));
  }
}

// Удалить values кроме указанных ID
async deleteValuesExcept(featureId: string, keepIds: string[]): Promise<void> {
  if (keepIds.length === 0) {
    await this.db.delete(productFeatureValue)
      .where(eq(productFeatureValue.featureId, featureId));
  } else {
    await this.db.delete(productFeatureValue)
      .where(and(
        eq(productFeatureValue.featureId, featureId),
        notInArray(productFeatureValue.id, keepIds)
      ));
  }
}

// Обновить value, если принадлежит featureId (защита от чужих ids).
async updateValue(
  featureId: string,
  valueId: string,
  data: { index: number }
): Promise<void> {
  await this.db.update(productFeatureValue)
    .set(data)
    .where(and(
      eq(productFeatureValue.id, valueId),
      eq(productFeatureValue.featureId, featureId)
    ));
}
```

---

## 6. Cascade Delete для Translations

**Важно:** При удалении features/values должны удаляться и translations.

Убедиться что в таблицах translations есть `ON DELETE CASCADE`:

```sql
-- В миграции translations (если ещё нет)
ALTER TABLE inventory.product_feature_translation
  DROP CONSTRAINT IF EXISTS product_feature_translation_feature_id_fkey,
  ADD CONSTRAINT product_feature_translation_feature_id_fkey
    FOREIGN KEY (feature_id)
    REFERENCES inventory.product_feature(id)
    ON DELETE CASCADE;

ALTER TABLE inventory.product_feature_value_translation
  DROP CONSTRAINT IF EXISTS product_feature_value_translation_value_id_fkey,
  ADD CONSTRAINT product_feature_value_translation_value_id_fkey
    FOREIGN KEY (feature_value_id)
    REFERENCES inventory.product_feature_value(id)
    ON DELETE CASCADE;
```

---

## 7. Контракт синхронизации (важно)

- Sync получает **полный** список features для продукта (snapshot). Частичные обновления запрещены.
- `index` — обязательное поле, формат: `"0"`, `"1"`, `"0-0"`, `"1-2"` и т.д.
- `id` — опционально, null для новых записей.
- `isGroup` — обязателен для всех элементов.
- Группы должны быть root items (index без dash).
- Parent вычисляется из index: `"0-0"` → parent `"0"`.
- Для существующих `id` запрещена смена типа (group ↔ attribute).
- `value.id` должен принадлежать текущему `featureId`.
- `value.index` — числовой индекс для сортировки (0, 1, 2, ...).
- `index` формат без ведущих нулей (кроме "0"), чтобы избежать коллизий сортировки.

---

## 8. Что удалить

После рефакторинга удалить:
- `offsetSortIndexes()` из FeatureRepository
- Все проверки на `slug` в валидации
- `seenSlugs` логику из FeaturesSyncScript

---

## Сравнение

| Метрика | До | После |
|---------|-----|-------|
| Строк кода (script) | ~500 | ~100 |
| Строк кода (валидация) | inline ~200 | 3 модуля ~180 |
| Unique constraints | 3 | 1 (DEFERRABLE) |
| Two-phase updates | Да | Нет |
| Temp slugs | Да | Нет |
| Edge cases | Много | Нет |
| Колонки в БД (feature) | 7 | 5 (`id`, `projectId`, `productId`, `index`, `isGroup`, `parentId`) |
| Колонки в БД (value) | 5 | 4 (`id`, `projectId`, `featureId`, `index`) |
| Feature.index | — | `int[]` |
| Value.index | — | `int` |
| Сортировка | Ручная | PostgreSQL `ORDER BY index` |
| Forward references | Не поддерживает | Автоматически |
| Мутация input | Да | Нет (immutable) |
| Валидация | Inline в script | 3-layer модульная |
| Zod schema | Нет | Да |
| DB queries в валидации | N+1 | 2 batch queries |
| Error paths | Иногда tree index | Всегда array index |
| Тестируемость валидации | Сложно (async) | Легко (2 sync + 1 async) |

---

## Итоговая структура

```
ProductFeature:
  id          UUID PRIMARY KEY
  projectId   UUID NOT NULL
  productId   UUID NOT NULL REFERENCES product(id)
  index       INTEGER[] NOT NULL        -- tree position: [0], [0, 1], etc.
  isGroup     BOOLEAN NOT NULL
  parentId    UUID REFERENCES product_feature(id)
  + translations: name

ProductFeatureValue:
  id          UUID PRIMARY KEY
  projectId   UUID NOT NULL
  featureId   UUID NOT NULL REFERENCES product_feature(id)
  index       INTEGER NOT NULL          -- position: 0, 1, 2, ...
  + translations: name
```

**Constraints:**
- `UNIQUE (product_id, index) DEFERRABLE INITIALLY DEFERRED`
- `CHECK (array_length(index, 1) > 0)` — index не пустой
- `CHECK (is_group = false OR array_length(index, 1) = 1)` — группы только root
- `CHECK (is_group = false OR parent_id IS NULL)` — группы без родителя

**Никаких slug — только ID, index и name из translations.**

---

## План выполнения

### Phase 1: Database & Models
1. [ ] Проверить использование `slug` в фронтенде/API (breaking change?)
2. [ ] Создать миграцию `0005_simplify_features.sql`:
   - Удалить `slug` из features и values
   - Удалить `sort_index` из features, добавить `index: int[]`
   - Переименовать `sort_index` → `index` в values
3. [ ] Проверить/добавить `ON DELETE CASCADE` для translations
4. [ ] Обновить модель `features.ts`

### Phase 2: GraphQL Schema
5. [ ] Обновить GraphQL schema:
   - Удалить `slug` везде
   - Добавить `index: [Int!]!` для features
   - Добавить `index: Int!` для values
6. [ ] Обновить FeatureResolver (удалить slug, добавить index)
7. [ ] Обновить FeatureValueResolver (удалить slug)

### Phase 3: Validation (новые файлы)
8. [ ] Создать `validation/schema.ts` — Zod schemas для структурной валидации
9. [ ] Создать `validation/semantic.ts` — бизнес-правила без БД
10. [ ] Создать `validation/database.ts` — проверки принадлежности ID
11. [ ] Создать `validation/index.ts` — re-export

### Phase 4: Repository & Script
12. [ ] Добавить методы в repository:
    - `findByIds(productId, ids)`
    - `findValueIdsByFeatureIds(featureIds)`
    - `deleteExcept(productId, keepIds)`
    - `deleteValuesExcept(featureId, keepIds)`
    - `updateValue(featureId, valueId, data)`
13. [ ] Переписать `FeaturesSyncScript.ts` с новой валидацией
14. [ ] Обновить DTO (добавить tree index types)
15. [ ] Удалить `offsetSortIndexes` из repository

### Phase 5: Frontend & Testing
16. [ ] Обновить фронтенд — генерировать tree index
17. [ ] Запустить тесты
18. [ ] Применить миграцию

---

## Ключевые улучшения валидации

### Index формат (`int[]`)
```
Root items:   [0], [1], [2], [3]
Children:     [0, 0], [0, 1], [1, 0], [2, 0], [2, 1]

Parent вычисляется автоматически:
  [0, 0] → parent = [0]
  [1, 2] → parent = [1]
  [0]    → parent = null (root, length === 1)
```

### Архитектура валидации

Валидация разделена на **три слоя**, каждый выполняется последовательно с early exit:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Structural (Zod)                                  │
│  - Типы полей, обязательные поля, форматы                   │
│  - Синхронная, быстрая                                      │
│  - При ошибке → сразу return                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Semantic (sync)                                   │
│  - Бизнес-правила на уровне input                           │
│  - Дубликаты index/id, parent ссылки, group constraints     │
│  - Синхронная, не требует БД                                │
│  - Собирает ВСЕ ошибки (не early exit)                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Database (async)                                  │
│  - Принадлежность ID продукту                               │
│  - Принадлежность value ID фиче                             │
│  - Один batch-запрос, потом валидация                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Layer 1: Zod Schema

**Файл:** `services/inventory/src/scripts/feature/validation/schema.ts`

```typescript
import { z } from "zod";

/**
 * Tree index as int[]:
 * - Минимум 1 элемент
 * - Максимум 2 элемента (root + child)
 * - Все элементы >= 0
 */
const TreeIndexSchema = z
  .array(z.number().int().min(0))
  .min(1, "Index must have at least 1 element")
  .max(2, "Index can have at most 2 elements (one level of nesting)");

const FeatureValueInputSchema = z.object({
  id: z.string().uuid().optional(),
  index: z.number().int().min(0),
  name: z.string().min(1, "Value name is required").max(255),
});

const FeatureSyncItemSchema = z.object({
  id: z.string().uuid().optional(),
  index: TreeIndexSchema,
  isGroup: z.boolean(),
  name: z.string().min(1, "Feature name is required").max(255),
  values: z.array(FeatureValueInputSchema).optional(),
});

export const FeatureSyncInputSchema = z.object({
  productId: z.string().uuid(),
  features: z.array(FeatureSyncItemSchema),
});

export type ValidatedFeatureInput = z.infer<typeof FeatureSyncItemSchema>;
export type ValidatedValueInput = z.infer<typeof FeatureValueInputSchema>;
```

---

### Layer 2: Semantic Validation

**Файл:** `services/inventory/src/scripts/feature/validation/semantic.ts`

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ValidatedFeatureInput, ValidatedValueInput } from "./schema.js";

/** Конвертирует index в строку для использования как ключ Map */
export function indexToKey(index: number[]): string {
  return index.join(",");
}

/** Возвращает parent index или null для root */
export function getParentIndex(index: number[]): number[] | null {
  return index.length > 1 ? index.slice(0, -1) : null;
}

/** Возвращает позицию внутри parent */
export function getPosition(index: number[]): number {
  return index[index.length - 1];
}

interface SemanticContext {
  readonly indexKeyToArrayIdx: Map<string, number>;
  readonly indexKeyToItem: Map<string, ValidatedFeatureInput>;
  readonly seenFeatureIds: Set<string>;
  readonly seenValueIds: Set<string>;
  readonly positionsByParentKey: Map<string, Set<number>>;
}

/**
 * Валидирует бизнес-правила на уровне input (без БД).
 * Возвращает все найденные ошибки.
 */
export function validateSemantic(features: ValidatedFeatureInput[]): UserError[] {
  const errors: UserError[] = [];
  const ctx: SemanticContext = {
    indexKeyToArrayIdx: new Map(),
    indexKeyToItem: new Map(),
    seenFeatureIds: new Set(),
    seenValueIds: new Set(),
    positionsByParentKey: new Map(),
  };

  // Первый проход: собираем карты и проверяем уникальность
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const key = indexToKey(f.index);
    const path = (field: string) => ["features", String(i), field];

    // Уникальность index
    if (ctx.indexKeyToItem.has(key)) {
      errors.push({
        message: `Duplicate index [${f.index.join(", ")}]`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      ctx.indexKeyToArrayIdx.set(key, i);
      ctx.indexKeyToItem.set(key, f);
    }

    // Уникальность id
    if (f.id) {
      if (ctx.seenFeatureIds.has(f.id)) {
        errors.push({
          message: `Duplicate feature id "${f.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        ctx.seenFeatureIds.add(f.id);
      }
    }

    // Уникальность position внутри parent
    const parentIndex = getParentIndex(f.index);
    const parentKey = parentIndex ? indexToKey(parentIndex) : "__root__";
    const position = getPosition(f.index);
    const positions = ctx.positionsByParentKey.get(parentKey) ?? new Set();
    if (positions.has(position)) {
      errors.push({
        message: `Duplicate position ${position} under parent [${parentIndex?.join(", ") ?? "root"}]`,
        field: path("index"),
        code: "DUPLICATE_POSITION",
      });
    } else {
      positions.add(position);
      ctx.positionsByParentKey.set(parentKey, positions);
    }

    // Группы только на root уровне (length === 1)
    if (f.isGroup && f.index.length !== 1) {
      errors.push({
        message: "Groups must be root items (index.length === 1)",
        field: path("index"),
        code: "GROUP_NOT_ROOT",
      });
    }

    // Группы не могут иметь values
    if (f.isGroup && f.values && f.values.length > 0) {
      errors.push({
        message: "Groups cannot have values",
        field: path("values"),
        code: "GROUP_HAS_VALUES",
      });
    }

    // Валидация values
    if (f.values) {
      validateValues(f.values, i, ctx.seenValueIds, errors);
    }
  }

  // Второй проход: проверяем parent ссылки
  for (const [key, item] of ctx.indexKeyToItem) {
    const parentIndex = getParentIndex(item.index);
    if (parentIndex === null) continue;

    const arrayIdx = ctx.indexKeyToArrayIdx.get(key)!;
    const path = (field: string) => ["features", String(arrayIdx), field];
    const parentKey = indexToKey(parentIndex);

    const parentItem = ctx.indexKeyToItem.get(parentKey);
    if (!parentItem) {
      errors.push({
        message: `Parent [${parentIndex.join(", ")}] not found in features list`,
        field: path("index"),
        code: "PARENT_NOT_FOUND",
      });
      continue;
    }

    if (!parentItem.isGroup) {
      errors.push({
        message: `Parent [${parentIndex.join(", ")}] must be a group`,
        field: path("index"),
        code: "PARENT_NOT_GROUP",
      });
    }
  }

  return errors;
}

function validateValues(
  values: ValidatedValueInput[],
  featureArrayIdx: number,
  globalValueIds: Set<string>,
  errors: UserError[]
): void {
  const localIndexes = new Set<number>();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const path = (field: string) => ["features", String(featureArrayIdx), "values", String(i), field];

    // Уникальность value id глобально
    if (v.id) {
      if (globalValueIds.has(v.id)) {
        errors.push({
          message: `Duplicate value id "${v.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        globalValueIds.add(v.id);
      }
    }

    // Уникальность index внутри feature
    if (localIndexes.has(v.index)) {
      errors.push({
        message: `Duplicate value index ${v.index}`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      localIndexes.add(v.index);
    }
  }
}
```

---

### Layer 3: Database Validation

**Файл:** `services/inventory/src/scripts/feature/validation/database.ts`

```typescript
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ValidatedFeatureInput } from "./schema.js";

interface ExistingFeature {
  id: string;
  isGroup: boolean;
}

interface DbValidationContext {
  existingById: Map<string, ExistingFeature>;
  valueIdsByFeatureId: Map<string, Set<string>>;
}

/**
 * Загружает данные из БД для валидации.
 * Один batch-запрос на features, один на values.
 */
export async function loadDbContext(
  repository: FeatureRepository,
  productId: string,
  features: ValidatedFeatureInput[]
): Promise<DbValidationContext> {
  const featureIds = features.flatMap((f) => (f.id ? [f.id] : []));
  const existing = await repository.findByIds(productId, featureIds);

  const featureIdsWithValues = features
    .filter((f) => f.id && f.values?.some((v) => v.id))
    .map((f) => f.id!);
  const valueIdMap = await repository.findValueIdsByFeatureIds(featureIdsWithValues);

  return {
    existingById: new Map(existing.map((f) => [f.id, f])),
    valueIdsByFeatureId: new Map(
      Array.from(valueIdMap.entries()).map(([k, v]) => [k, new Set(v)])
    ),
  };
}

/**
 * Валидирует принадлежность ID и immutable constraints.
 */
export function validateDatabase(
  features: ValidatedFeatureInput[],
  ctx: DbValidationContext
): UserError[] {
  const errors: UserError[] = [];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const path = (field: string) => ["features", String(i), field];

    if (f.id) {
      const existing = ctx.existingById.get(f.id);

      // ID должен принадлежать продукту
      if (!existing) {
        errors.push({
          message: `Feature "${f.id}" not found in this product`,
          field: path("id"),
          code: "NOT_FOUND",
        });
        continue;
      }

      // Нельзя менять тип (group ↔ attribute)
      if (existing.isGroup !== f.isGroup) {
        errors.push({
          message: "Cannot change feature type (group ↔ attribute)",
          field: path("isGroup"),
          code: "TYPE_CHANGE_FORBIDDEN",
        });
      }
    }

    // Валидация value ownership
    if (f.id && f.values) {
      const allowedValueIds = ctx.valueIdsByFeatureId.get(f.id) ?? new Set();

      for (let j = 0; j < f.values.length; j++) {
        const v = f.values[j];
        if (v.id && !allowedValueIds.has(v.id)) {
          errors.push({
            message: `Value "${v.id}" does not belong to this feature`,
            field: ["features", String(i), "values", String(j), "id"],
            code: "VALUE_NOT_FOUND",
          });
        }
      }
    }

    // Новая feature не может ссылаться на существующие values
    if (!f.id && f.values?.some((v) => v.id)) {
      errors.push({
        message: "New feature cannot reference existing value IDs",
        field: path("values"),
        code: "INVALID_VALUE_REFERENCE",
      });
    }
  }

  return errors;
}
```

---

### Интеграция в Script

**Файл:** `services/inventory/src/scripts/feature/FeaturesSyncScript.ts`

```typescript
import { FeatureSyncInputSchema } from "./validation/schema.js";
import { validateSemantic, parseTreeIndex } from "./validation/semantic.js";
import { loadDbContext, validateDatabase } from "./validation/database.js";

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {

  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    // ═══════════════════════════════════════════════════════════════════
    // Layer 1: Structural validation (Zod)
    // ═══════════════════════════════════════════════════════════════════
    const parseResult = FeatureSyncInputSchema.safeParse(params);
    if (!parseResult.success) {
      return {
        product: undefined,
        features: [],
        userErrors: parseResult.error.issues.map((issue) => ({
          message: issue.message,
          field: issue.path.map(String),
          code: "VALIDATION_ERROR",
        })),
      };
    }
    const { productId, features } = parseResult.data;

    // ═══════════════════════════════════════════════════════════════════
    // Product existence check
    // ═══════════════════════════════════════════════════════════════════
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // ═══════════════════════════════════════════════════════════════════
    // Layer 2: Semantic validation (sync, no DB)
    // ═══════════════════════════════════════════════════════════════════
    const semanticErrors = validateSemantic(features);
    if (semanticErrors.length > 0) {
      return { product: undefined, features: [], userErrors: semanticErrors };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Layer 3: Database validation (async, batch queries)
    // ═══════════════════════════════════════════════════════════════════
    const dbCtx = await loadDbContext(this.repository.feature, productId, features);
    const dbErrors = validateDatabase(features, dbCtx);
    if (dbErrors.length > 0) {
      return { product: undefined, features: [], userErrors: dbErrors };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sync logic (после успешной валидации)
    // ═══════════════════════════════════════════════════════════════════
    // ... остальная логика sync
  }
}
```

---

### Пример ошибок

```json
// Input
{
  "productId": "...",
  "features": [
    { "index": [0], "isGroup": true, "name": "Размеры" },
    { "index": [0], "isGroup": false, "name": "Дубликат" },     // дубликат index
    { "index": [0, 0], "isGroup": true, "name": "Вложенная" },  // группа не на root
    { "index": [1, 0], "isGroup": false, "name": "Сирота" }     // parent [1] не существует
  ]
}

// Errors
[
  { "message": "Duplicate index [0]", "field": ["features", "1", "index"], "code": "DUPLICATE_INDEX" },
  { "message": "Groups must be root items (index.length === 1)", "field": ["features", "2", "index"], "code": "GROUP_NOT_ROOT" },
  { "message": "Parent [1] not found in features list", "field": ["features", "3", "index"], "code": "PARENT_NOT_FOUND" }
]
```

---

### Immutable подход
```
Input → Zod parse → ValidatedFeatureInput[]
                              ↓
                    validateSemantic() → errors или продолжаем
                              ↓
                    loadDbContext() → DbValidationContext
                              ↓
                    validateDatabase() → errors или продолжаем
                              ↓
                    resolveFeatures() → ResolvedFeature[] (readonly)
                              ↓
                    upsertFeature()
```

Входные данные не мутируются. Все созданные ID хранятся в `indexKeyToDbId` Map.

---

### Пример input
```json
{
  "features": [
    { "index": [0], "isGroup": true, "name": "Размеры" },
    { "index": [0, 0], "isGroup": false, "name": "Длина", "values": [
      { "index": 0, "name": "100 см" },
      { "index": 1, "name": "150 см" }
    ]},
    { "index": [0, 1], "isGroup": false, "name": "Ширина" },
    { "index": [1], "isGroup": true, "name": "Материалы" },
    { "index": [1, 0], "isGroup": false, "name": "Основа" },
    { "index": [2], "isGroup": false, "name": "Цвет" }
  ]
}
```

- `[0]`, `[1]`, `[2]` — root items (группы или атрибуты без родителя)
- `[0, 0]`, `[0, 1]` — дети группы `[0]` (Размеры)
- `[1, 0]` — ребёнок группы `[1]` (Материалы)
- `id` можно не указывать для новых записей
- Сортировка: PostgreSQL `ORDER BY index` автоматически сортирует как `[0] < [0, 0] < [0, 1] < [1] < [1, 0] < [2]`
