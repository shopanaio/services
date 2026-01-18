# Feature Sync Simplification Plan

## Проблема

Текущий `FeaturesSyncScript` (~500 строк) слишком сложный из-за обхода unique constraints:
- Two-phase sortIndex updates (offset + final)
- Temp slugs для избежания конфликтов
- Сложный порядок операций (UPDATE → DELETE vs DELETE → UPDATE)
- Много edge cases

## Решение

1. **Удалить slug из features** — name хранится в translations, slug избыточен
2. **Убрать unique constraints** на sortIndex — не нужны для бизнес-логики
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

-- 2. Убираем partial unique indexes на sortIndex (не нужны)
DROP INDEX IF EXISTS inventory.product_feature_root_sort_idx;
DROP INDEX IF EXISTS inventory.product_feature_child_sort_idx;

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
  id: ID
  clientId: String
  isGroup: Boolean!
  parentId: ID
  parentClientId: String
  name: String!
  sortIndex: Int
  values: [ProductFeatureValueSyncInput!]
}

type ProductFeatureValue implements Node @key(fields: "id") {
  id: ID!
  name: String!           # из translations
}

input ProductFeatureValueSyncInput {
  id: ID
  name: String!
  sortIndex: Int
}
```

**Убрано:**
- `slug` из ProductFeature
- `slug` из ProductFeatureValue
- `slug` из всех input типов

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
  readonly index: number;
  readonly input: FeatureSyncItemInput;
  readonly id: string;
  readonly parentId: string | null;
  readonly sortIndex: number;
}

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {

  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    const { productId, features } = params;

    // 1. Проверить что product существует
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // 2. Валидация input (двухпроходная для forward references)
    const errors = this.validateInput(features);
    if (errors.length > 0) {
      return { product: undefined, features: [], userErrors: errors };
    }

    // 3. Удалить лишние features (которых нет в input)
    const keepIds = features.filter((f) => f.id).map((f) => f.id!);
    await this.repository.feature.deleteExcept(productId, keepIds);

    // 4. Резолвить ID, parentId и нормализовать sortIndex
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
   * Двухпроходная валидация:
   * 1. Первый проход — собираем все id/clientId и проверяем дубликаты
   * 2. Второй проход — валидируем ссылки (parentId/parentClientId)
   */
  private validateInput(features: FeatureSyncItemInput[]): UserError[] {
    const errors: UserError[] = [];

    // Индексы для быстрого поиска
    const idToIndex = new Map<string, number>();
    const clientIdToIndex = new Map<string, number>();

    const path = (i: number, field: string) => ["features", String(i), field];

    // ═══════════════════════════════════════════════════════════════════
    // Первый проход: собираем индексы, проверяем дубликаты и базовые правила
    // ═══════════════════════════════════════════════════════════════════
    for (const [i, f] of features.entries()) {
      // Дубликаты id
      if (f.id) {
        if (idToIndex.has(f.id)) {
          errors.push({
            message: `Duplicate id "${f.id}"`,
            field: path(i, "id"),
            code: "DUPLICATE"
          });
        } else {
          idToIndex.set(f.id, i);
        }
      }

      // Дубликаты clientId
      if (f.clientId) {
        if (clientIdToIndex.has(f.clientId)) {
          errors.push({
            message: `Duplicate clientId "${f.clientId}"`,
            field: path(i, "clientId"),
            code: "DUPLICATE"
          });
        } else {
          clientIdToIndex.set(f.clientId, i);
        }
      }

      // isGroup обязателен для новых элементов (контракт)
      if (f.id == null && f.isGroup == null) {
        errors.push({
          message: "isGroup is required for new features",
          field: path(i, "isGroup"),
          code: "REQUIRED"
        });
      }

      // Группы не могут иметь parent
      if (f.isGroup && (f.parentId || f.parentClientId)) {
        errors.push({
          message: "Groups cannot have a parent",
          field: path(i, "parentId"),
          code: "INVALID"
        });
      }

      // Группы не могут иметь values
      if (f.isGroup && f.values?.length) {
        errors.push({
          message: "Groups cannot have values",
          field: path(i, "values"),
          code: "INVALID"
        });
      }

      // Нельзя указать оба parentId и parentClientId
      if (f.parentId && f.parentClientId) {
        errors.push({
          message: "Cannot specify both parentId and parentClientId",
          field: path(i, "parentId"),
          code: "INVALID"
        });
      }

      // Валидация values
      if (f.values) {
        const valueIds = new Set<string>();
        for (const [vi, v] of f.values.entries()) {
          if (v.id) {
            if (valueIds.has(v.id)) {
              errors.push({
                message: `Duplicate value id "${v.id}"`,
                field: [...path(i, "values"), String(vi), "id"],
                code: "DUPLICATE",
              });
            } else {
              valueIds.add(v.id);
            }
          }
          if (!v.name?.trim()) {
            errors.push({
              message: "Value name is required",
              field: [...path(i, "values"), String(vi), "name"],
              code: "REQUIRED",
            });
          }
        }
      }

      // name обязателен
      if (!f.name?.trim()) {
        errors.push({
          message: "Name is required",
          field: path(i, "name"),
          code: "REQUIRED"
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Второй проход: валидируем ссылки (теперь все clientId известны)
    // ═══════════════════════════════════════════════════════════════════
    for (const [i, f] of features.entries()) {
      // Пропускаем группы — у них не может быть parent
      if (f.isGroup) continue;

      if (f.parentClientId) {
        const parentIndex = clientIdToIndex.get(f.parentClientId);

        if (parentIndex === undefined) {
          errors.push({
            message: `Parent with clientId "${f.parentClientId}" not found`,
            field: path(i, "parentClientId"),
            code: "NOT_FOUND"
          });
        } else {
          const parent = features[parentIndex];
          if (!parent.isGroup) {
            errors.push({
              message: `Parent "${f.parentClientId}" must be a group`,
              field: path(i, "parentClientId"),
              code: "INVALID"
            });
          }
        }
      }

      // parentId будет проверен в resolveFeatures через БД
    }

    return errors;
  }

  /**
   * Резолвит features: создаёт новые группы, разрешает parentId, нормализует sortIndex.
   * Возвращает immutable массив ResolvedFeature.
   */
  private async resolveFeatures(
    productId: string,
    features: FeatureSyncItemInput[]
  ): Promise<ResolvedFeature[]> {
    // clientId → созданный id (для новых групп)
    const clientIdToId = new Map<string, string>();
    // index → созданный id (для новых items)
    const indexToId = new Map<number, string>();

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 1: Создаём новые группы (они не имеют parentId, поэтому первыми)
    // ═══════════════════════════════════════════════════════════════════
    for (const [i, f] of features.entries()) {
      if (f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: true,
          parentId: null,
          sortIndex: 0,
        });
        indexToId.set(i, created.id);
        if (f.clientId) {
          clientIdToId.set(f.clientId, created.id);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 2: Создаём новые атрибуты
    // ═══════════════════════════════════════════════════════════════════
    for (const [i, f] of features.entries()) {
      if (!f.isGroup && !f.id) {
        const created = await this.repository.feature.create(productId, {
          isGroup: false,
          parentId: null, // временно, обновим в upsert
          sortIndex: 0,
        });
        indexToId.set(i, created.id);
        if (f.clientId) {
          clientIdToId.set(f.clientId, created.id);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 3: Резолвим parentId для каждого item
    // ═══════════════════════════════════════════════════════════════════
    const resolveParentId = (f: FeatureSyncItemInput): string | null => {
      if (f.isGroup) return null;
      if (f.parentId) return f.parentId;
      if (f.parentClientId) {
        const resolved = clientIdToId.get(f.parentClientId);
        if (!resolved) {
          // parentClientId ссылается на существующую группу с id
          const parentIndex = features.findIndex(
            (p) => p.clientId === f.parentClientId
          );
          if (parentIndex !== -1 && features[parentIndex].id) {
            return features[parentIndex].id!;
          }
        }
        return resolved ?? null;
      }
      return null;
    };

    // ═══════════════════════════════════════════════════════════════════
    // Шаг 4: Группируем по контейнеру и нормализуем sortIndex
    // ═══════════════════════════════════════════════════════════════════
    const items: Array<{
      index: number;
      input: FeatureSyncItemInput;
      id: string;
      parentId: string | null;
      sortIndex: number;
    }> = features.map((f, i) => ({
      index: i,
      input: f,
      id: f.id ?? indexToId.get(i)!,
      parentId: resolveParentId(f),
      sortIndex: f.sortIndex ?? i,
    }));

    // Проверить, что parentId принадлежит этому продукту и что parent — группа
    // Проверить, что parentId != id (нет self-parent)
    // Проверить, что isGroup для существующих id совпадает с БД

    // Группируем по parentId для нормализации sortIndex
    const byContainer = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.parentId ?? "__root__";
      const list = byContainer.get(key) ?? [];
      list.push(item);
      byContainer.set(key, list);
    }

    // Нормализуем sortIndex в каждом контейнере (0, 1, 2, ...)
    for (const containerItems of byContainer.values()) {
      containerItems.sort((a, b) => a.sortIndex - b.sortIndex);
      containerItems.forEach((item, idx) => {
        item.sortIndex = idx;
      });
    }

    return items;
  }

  private async upsertFeature(productId: string, item: ResolvedFeature): Promise<void> {
    const data = {
      isGroup: item.input.isGroup ?? false,
      parentId: item.parentId,
      sortIndex: item.sortIndex,
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

    // Сортируем и нормализуем sortIndex
    const sorted = [...values]
      .map((v, i) => ({ ...v, sortIndex: v.sortIndex ?? i }))
      .sort((a, b) => a.sortIndex - b.sortIndex);

    // valueId map для новых values
    const valueIdMap = new Map<number, string>();

    for (const [index, value] of sorted.entries()) {
      let valueId: string;

      if (value.id) {
        // Перед обновлением убедиться, что value.id принадлежит featureId
        await this.repository.feature.updateValue(value.id, { sortIndex: index });
        valueId = value.id;
      } else {
        const created = await this.repository.feature.createValue(featureId, {
          sortIndex: index
        });
        valueId = created.id;
        valueIdMap.set(index, valueId);
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
- `isGroup` обязателен для всех новых элементов.
- Для существующих `id` запрещена смена типа (group ↔ attribute).
- `parentId` должен быть группой из того же `productId`.
- `value.id` должен принадлежать текущему `featureId`.

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
| Forward references | Не поддерживает | Поддерживает |
| Мутация input | Да | Нет (immutable) |

---

## Итоговая структура

```
ProductFeature:
  id, projectId, productId, isGroup, parentId, sortIndex
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
5. [ ] Обновить GraphQL schema (удалить slug везде, `isGroup` сделать обязательным)
6. [ ] Обновить FeatureResolver (удалить slug метод)
7. [ ] Обновить FeatureValueResolver (удалить slug метод)
8. [ ] Добавить методы `deleteExcept`, `deleteValuesExcept` в repository
9. [ ] Переписать `FeaturesSyncScript.ts` (с двухпроходной валидацией и проверкой ownership)
10. [ ] Обновить DTO (удалить slug из input)
11. [ ] Удалить `offsetSortIndexes` из repository
12. [ ] Запустить тесты
13. [ ] Применить миграцию

---

## Ключевые улучшения валидации

### Двухпроходная валидация
```
Проход 1: Собираем все id/clientId → Map<string, index>
          Проверяем дубликаты, базовые правила

Проход 2: Валидируем ссылки (parentId/parentClientId)
          Теперь все clientId известны → forward references работают
```

### Immutable подход
```
Input → resolveFeatures() → ResolvedFeature[] (readonly)
                              ↓
                         upsertFeature()
```

Входные данные не мутируются. Все созданные ID хранятся в отдельных Map.
