# Feature Sync Simplification Plan

## Проблема

Текущий `FeaturesSyncScript` (~500 строк) слишком сложный из-за обхода unique constraints:
- Two-phase sortIndex updates (offset + final)
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

-- 2. Убираем partial unique indexes на sortIndex
DROP INDEX IF EXISTS inventory.product_feature_root_sort_idx;
DROP INDEX IF EXISTS inventory.product_feature_child_sort_idx;

-- 2.1 Добавляем строковый index (как в контракте)
ALTER TABLE inventory.product_feature
  ADD COLUMN index text NOT NULL;

-- 2.2 Уникальность index в рамках продукта (отложенная проверка)
ALTER TABLE inventory.product_feature
  ADD CONSTRAINT product_feature_product_id_index_uniq
    UNIQUE (product_id, index)
    DEFERRABLE INITIALLY DEFERRED;

-- 3. Удаляем колонку slug
ALTER TABLE inventory.product_feature
  DROP COLUMN slug;

-- 4. Убираем slug из values тоже
ALTER TABLE inventory.product_feature_value
  DROP CONSTRAINT IF EXISTS product_feature_value_feature_id_slug_key;

ALTER TABLE inventory.product_feature_value
  DROP CONSTRAINT IF EXISTS product_feature_value_slug_unique;

ALTER TABLE inventory.product_feature_value
  DROP COLUMN slug;
```

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
    index: text("index").notNull(),
    isGroup: boolean("is_group").notNull().default(false),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => productFeature.id,
      { onDelete: "cascade" }
    ),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (table) => [
    check(
      "feature_group_no_parent",
      sql`${table.isGroup} = false OR ${table.parentId} IS NULL`
    ),
    index("product_feature_children_idx").on(
      table.productId,
      table.parentId,
      table.sortIndex
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
    sortIndex: integer("sort_index").notNull(),
  },
  (table) => [
    index("idx_product_feature_value_feature_id").on(table.featureId),
  ]
);
```

**Что убрали:**
- `slug` из ProductFeature
- `slug` из ProductFeatureValue
- Все unique constraints на slug
- Partial unique indexes на sortIndex

**Что добавили:**
- `index` (string) как в контракте
- `DEFERRABLE` уникальный constraint на `(product_id, index)`

**Что оставили:**
- `index("product_feature_children_idx")` — для ORDER BY
- `index("idx_product_feature_value_feature_id")` — для JOIN

---

## 3. Изменения в GraphQL Schema

**Файл:** `services/inventory/src/api/graphql-admin/schema/features.graphql`

```graphql
"""A product feature represents either a group or an attribute."""
type ProductFeature implements Node @key(fields: "id") {
  id: ID!
  isGroup: Boolean!
  name: String!           # из translations
  sortIndex: Int!
  parent: ProductFeature
  children: [ProductFeature!]!
  values: [ProductFeatureValue!]!
}

input ProductFeatureSyncItemInput {
  """Database ID. Null for new records."""
  id: ID
  """
  Tree-like index that serves as both identifier and sort position.
  Format: "0", "1", "2" for root items; "0-0", "0-1", "1-0" for children.
  Parent is derived from index: parent of "0-0" is "0", parent of "1-2" is "1".
  Root items have no dash. Groups must be root items.
  """
  index: String!
  isGroup: Boolean!
  name: String!
  values: [ProductFeatureValueSyncInput!]
}

type ProductFeatureValue implements Node @key(fields: "id") {
  id: ID!
  name: String!           # из translations
}

input ProductFeatureValueSyncInput {
  """Database ID. Null for new records."""
  id: ID
  """Sort index within the feature's values (0, 1, 2, ...)"""
  index: Int!
  name: String!
}
```

**Убрано:**
- `slug` из ProductFeature
- `slug` из ProductFeatureValue
- `slug` из всех input типов
- Добавлен `index` — древовидный идентификатор
- `sortIndex` — теперь вычисляется из `index`

**Новый контракт index:**
- Формат: `"0"`, `"1"`, `"2"` для root items; `"0-0"`, `"0-1"`, `"1-0"` для children
- Parent вычисляется из index: parent of `"0-0"` is `"0"`, parent of `"1-2"` is `"1"`
- Root items (без dash) могут быть группами или атрибутами без родителя
- Items с dash (children) — только атрибуты, их родитель — группа с index до dash

---

## 4. Упрощённый FeaturesSyncScript

**Файл:** `services/inventory/src/scripts/feature/FeaturesSyncScript.ts`

```typescript
import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type {
  FeatureSyncParams,
  FeatureSyncResult,
  FeatureSyncItemInput,
  FeatureValueSyncInput,
} from "./dto/index.js";

interface ResolvedFeature {
  readonly index: string;           // tree index: "0", "1", "0-0", "0-1"
  readonly input: FeatureSyncItemInput;
  readonly id: string;
  readonly parentId: string | null;
  readonly sortIndex: number;       // numeric sort within container
}

/**
 * Парсит tree index и возвращает parent index и позицию.
 * "0" → { parent: null, position: 0 }
 * "0-0" → { parent: "0", position: 0 }
 * "1-2" → { parent: "1", position: 2 }
 */
function parseTreeIndex(index: string): { parent: string | null; position: number } {
  const dashPos = index.lastIndexOf("-");
  if (dashPos === -1) {
    return { parent: null, position: parseInt(index, 10) };
  }
  return {
    parent: index.slice(0, dashPos),
    position: parseInt(index.slice(dashPos + 1), 10),
  };
}

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {

  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    const { productId, features } = params;

    // 1. Проверить что product существует
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // 2. Валидация input
    const errors = await this.validateInput(productId, features);
    if (errors.length > 0) {
      return { product: undefined, features: [], userErrors: errors };
    }

    // 3. Удалить лишние features (которых нет в input)
    const keepIds = features.filter((f) => f.id).map((f) => f.id!);
    await this.repository.feature.deleteExcept(productId, keepIds);

    // 4. Резолвить ID, parentId и sortIndex из tree index
    const resolved = await this.resolveFeatures(productId, features);

    // 5. Upsert все features
    for (const item of resolved) {
      await this.upsertFeature(productId, item);
    }

    // 6. Sync values для атрибутов
    for (const item of resolved) {
      if (!item.input.isGroup) {
        await this.syncValues(item.id, item.input.values ?? []);
      }
    }

    // 7. Вернуть результат
    const [product, syncedFeatures] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.feature.findByProductId(productId),
    ]);

    return { product: product ?? undefined, features: syncedFeatures, userErrors: [] };
  }

  /**
   * Валидация input с использованием tree index.
   * Двухпроходная: сначала локальные правила, потом ссылки и принадлежность ID.
   */
  private async validateInput(
    productId: string,
    features: FeatureSyncItemInput[]
  ): Promise<UserError[]> {
    const errors: UserError[] = [];
    const indexRegex = /^(0|[1-9]\d*)(-(0|[1-9]\d*))?$/;
    const path = (index: string, field: string) => ["features", index, field];
    const addError = (index: string, field: string, message: string, code: string) => {
      errors.push({ message, field: path(index, field), code });
    };

    const indexToItem = new Map<string, FeatureSyncItemInput>();
    const positionsByParent = new Map<string, Set<number>>();
    const idSet = new Set<string>();
    const valueIdSet = new Set<string>();

    const inputFeatureIds = features.flatMap((f) => (f.id ? [f.id] : []));
    const existingById = await this.loadExistingFeatures(productId, inputFeatureIds);

    for (const [i, f] of features.entries()) {
      const idx = f.index ?? String(i);
      if (!f.index || !indexRegex.test(f.index)) {
        addError(idx, "index", `Invalid index format "${f.index}"`, "INVALID");
        continue;
      }

      if (indexToItem.has(f.index)) {
        addError(f.index, "index", `Duplicate index "${f.index}"`, "DUPLICATE");
      } else {
        indexToItem.set(f.index, f);
      }

      if (f.id) {
        if (idSet.has(f.id)) {
          addError(f.index, "id", `Duplicate id "${f.id}"`, "DUPLICATE");
        } else {
          idSet.add(f.id);
        }

        const existing = existingById.get(f.id);
        if (!existing) {
          addError(f.index, "id", `Feature id "${f.id}" does not belong to product`, "NOT_FOUND");
        } else if (existing.isGroup !== f.isGroup) {
          addError(f.index, "isGroup", "Changing feature type is not allowed", "INVALID");
        }
      }

      const parsed = parseTreeIndex(f.index);
      const parentKey = parsed.parent ?? "__root__";
      const positions = positionsByParent.get(parentKey) ?? new Set<number>();
      if (positions.has(parsed.position)) {
        addError(f.index, "index", `Duplicate sortIndex ${parsed.position} under same parent`, "DUPLICATE");
      } else {
        positions.add(parsed.position);
        positionsByParent.set(parentKey, positions);
      }

      if (f.isGroup && parsed.parent !== null) {
        addError(f.index, "index", "Groups must be root items (index without dash)", "INVALID");
      }
      if (f.isGroup && f.values?.length) {
        addError(f.index, "values", "Groups cannot have values", "INVALID");
      }
      if (!f.name?.trim()) {
        addError(f.index, "name", "Name is required", "REQUIRED");
      }

      this.validateValuesLocal(f, valueIdSet, addError);
    }

    this.validateParentLinks(indexToItem, addError);
    await this.validateValueOwnership(features, addError);

    return errors;
  }

  private async loadExistingFeatures(productId: string, ids: string[]) {
    const existing = await this.repository.feature.findByIds(productId, ids);
    return new Map(existing.map((f) => [f.id, f]));
  }

  private validateParentLinks(
    indexToItem: Map<string, FeatureSyncItemInput>,
    addError: (index: string, field: string, message: string, code: string) => void
  ): void {
    for (const [idx, f] of indexToItem) {
      const parsed = parseTreeIndex(idx);
      if (parsed.parent === null) continue;
      const parentItem = indexToItem.get(parsed.parent);
      if (!parentItem) {
        addError(idx, "index", `Parent index "${parsed.parent}" not found`, "NOT_FOUND");
      } else if (!parentItem.isGroup) {
        addError(idx, "index", `Parent "${parsed.parent}" must be a group`, "INVALID");
      }
    }
  }

  private validateValuesLocal(
    feature: FeatureSyncItemInput,
    globalValueIds: Set<string>,
    addError: (index: string, field: string, message: string, code: string) => void
  ): void {
    if (!feature.values) return;
    const localIds = new Set<string>();
    const localIndexes = new Set<number>();

    for (const v of feature.values) {
      if (v.id) {
        if (globalValueIds.has(v.id)) {
          addError(feature.index, `values[${v.index}].id`, `Duplicate value id "${v.id}"`, "DUPLICATE");
        } else {
          globalValueIds.add(v.id);
        }

        if (localIds.has(v.id)) {
          addError(feature.index, `values[${v.index}].id`, `Duplicate value id "${v.id}"`, "DUPLICATE");
        } else {
          localIds.add(v.id);
        }
      }

      if (localIndexes.has(v.index)) {
        addError(feature.index, `values[${v.index}].index`, `Duplicate value index ${v.index}`, "DUPLICATE");
      } else {
        localIndexes.add(v.index);
      }

      if (!v.name?.trim()) {
        addError(feature.index, `values[${v.index}].name`, "Value name is required", "REQUIRED");
      }
    }
  }

  private async validateValueOwnership(
    features: FeatureSyncItemInput[],
    addError: (index: string, field: string, message: string, code: string) => void
  ): Promise<void> {
    const featureIds = features.filter((f) => f.id && f.values?.length).map((f) => f.id!);
    if (featureIds.length === 0) return;

    const valueIdsByFeature = await this.repository.feature.findValueIdsByFeatureIds(featureIds);
    for (const f of features) {
      if (!f.id || !f.values?.length) continue;
      const allowed = new Set(valueIdsByFeature.get(f.id) ?? []);
      for (const v of f.values) {
        if (v.id && !allowed.has(v.id)) {
          addError(f.index, `values[${v.index}].id`, `Value id "${v.id}" does not belong to feature`, "NOT_FOUND");
        }
      }
    }
  }

  /**
   * Резолвит features: создаёт новые записи, разрешает parentId из tree index.
   */
  private async resolveFeatures(
    productId: string,
    features: FeatureSyncItemInput[]
  ): Promise<ResolvedFeature[]> {
    // index → database id (для новых записей)
    const indexToDbId = new Map<string, string>();

    // Сначала обрабатываем существующие записи (у которых есть id)
    for (const f of features) {
      if (f.id) {
        indexToDbId.set(f.index, f.id);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 1: Создаём новые группы (root items, они не зависят от других)
    // ═══════════════════════════════════════════════════════════════════
    for (const f of features) {
      if (f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: true,
          parentId: null,
          index: f.index,
          sortIndex: 0,
        });
        indexToDbId.set(f.index, created.id);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 2: Создаём новые атрибуты
    // ═══════════════════════════════════════════════════════════════════
    for (const f of features) {
      if (!f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: false,
          index: f.index,
          parentId: null, // временно, обновим в upsert
          sortIndex: 0,
        });
        indexToDbId.set(f.index, created.id);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 3: Собираем resolved items с parentId из tree index
    // ═══════════════════════════════════════════════════════════════════
    const resolved: ResolvedFeature[] = features.map((f) => {
      const parsed = parseTreeIndex(f.index);
      const parentId = parsed.parent ? (indexToDbId.get(parsed.parent) ?? null) : null;

      return {
        index: f.index,
        input: f,
        id: indexToDbId.get(f.index)!,
        parentId,
        sortIndex: parsed.position,
      };
    });

    return resolved;
  }

  private async upsertFeature(productId: string, item: ResolvedFeature): Promise<void> {
    const data = {
      isGroup: item.input.isGroup,
      parentId: item.parentId,
      sortIndex: item.sortIndex,
      index: item.index,
    };

    // Всегда update, потому что новые уже созданы в resolveFeatures
    await this.repository.feature.update(item.id, data);

    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: item.id,
      locale: this.getLocale(),
      name: item.input.name,
    });
  }

  private async syncValues(featureId: string, values: FeatureValueSyncInput[]): Promise<void> {
    const keepIds = values.filter((v) => v.id).map((v) => v.id!);
    await this.repository.feature.deleteValuesExcept(featureId, keepIds);

    // Сортируем по index
    const sorted = [...values].sort((a, b) => a.index - b.index);

    for (const value of sorted) {
      let valueId: string;

      if (value.id) {
        // Обновляем только если value принадлежит текущему featureId.
        await this.repository.feature.updateValue(featureId, value.id, { sortIndex: value.index });
        valueId = value.id;
      } else {
        const created = await this.repository.feature.createValue(featureId, {
          sortIndex: value.index
        });
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
  data: { sortIndex: number }
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
| Строк кода | ~500 | ~180 |
| Unique constraints | 3 | 0 |
| Two-phase updates | Да | Нет |
| Temp slugs | Да | Нет |
| Edge cases | Много | Нет |
| Колонки в БД | 6 + 4 | 5 + 3 |
| Tree index | Нет | Да |
| Forward references | Не поддерживает | Автоматически (tree index) |
| Мутация input | Да | Нет (immutable) |

---

## Итоговая структура

```
ProductFeature:
  id, projectId, productId, index, isGroup, parentId, sortIndex
  + translations: name

ProductFeatureValue:
  id, projectId, featureId, sortIndex
  + translations: name
```

**Никаких unique constraints, никаких slug — только ID и name из translations.**

---

## План выполнения

1. [ ] Проверить использование `slug` в фронтенде/API (breaking change?)
2. [ ] Создать миграцию `0005_remove_feature_slug.sql`
3. [ ] Проверить/добавить `ON DELETE CASCADE` для translations
4. [ ] Обновить модель `features.ts` (удалить slug везде)
5. [ ] Обновить GraphQL schema:
   - Удалить slug везде
   - Добавить `index: String!` для tree index
   - Для values заменить `sortIndex` на `index: Int!`
6. [ ] Обновить FeatureResolver (удалить slug метод)
7. [ ] Обновить FeatureValueResolver (удалить slug метод)
8. [ ] Добавить методы `findByIds`, `findValueIdsByFeatureIds`, `deleteExcept`, `deleteValuesExcept`, `updateValue(featureId, valueId, data)` в repository
9. [ ] Переписать `FeaturesSyncScript.ts` (tree index, двухпроходная валидация, проверка принадлежности id, запрет смены типа)
10. [ ] Обновить DTO (добавить tree index)
11. [ ] Удалить `offsetSortIndexes` из repository
12. [ ] Обновить фронтенд — генерировать tree index
13. [ ] Запустить тесты
14. [ ] Применить миграцию

---

## Ключевые улучшения валидации

### Tree Index формат
```
Root items:   "0", "1", "2", "3"
Children:     "0-0", "0-1", "1-0", "2-0", "2-1"

Parent вычисляется автоматически:
  "0-0" → parent = "0"
  "1-2" → parent = "1"
  "0"   → parent = null (root)
```

### Двухпроходная валидация
```
Проход 1: Собираем все index → Map<string, item>
          Проверяем дубликаты, формат index, базовые правила

Проход 2: Валидируем parent ссылки
          Проверяем что parent существует и является группой
```

### Immutable подход
```
Input → resolveFeatures() → ResolvedFeature[] (readonly)
                              ↓
                         upsertFeature()
```

Входные данные не мутируются. Все созданные ID хранятся в `indexToDbId` Map.

### Пример input
```json
{
  "features": [
    { "index": "0", "isGroup": true, "name": "Размеры" },
    { "index": "0-0", "isGroup": false, "name": "Длина", "values": [
      { "index": 0, "name": "100 см" },
      { "index": 1, "name": "150 см" }
    ]},
    { "index": "0-1", "isGroup": false, "name": "Ширина" },
    { "index": "1", "isGroup": true, "name": "Материалы" },
    { "index": "1-0", "isGroup": false, "name": "Основа" },
    { "index": "2", "isGroup": false, "name": "Цвет" }
  ]
}
```

- `"0"`, `"1"`, `"2"` — root items (группы или атрибуты без родителя)
- `"0-0"`, `"0-1"` — дети группы `"0"` (Размеры)
- `"1-0"` — ребёнок группы `"1"` (Материалы)
- `id` можно не указывать для новых записей
