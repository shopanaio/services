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
  isGroup: Boolean
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

type ResolvedItem = FeatureSyncItemInput & {
  resolvedId?: string;
  resolvedParentId: string | null;
  sortIndex: number;
};

export class FeaturesSyncScript extends BaseScript<FeatureSyncParams, FeatureSyncResult> {

  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    const { productId, features } = params;

    // 1. Проверить что product существует
    if (!(await this.repository.product.exists(productId))) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    // 2. Валидация input
    const errors = this.validateInput(features);
    if (errors.length > 0) {
      return { product: undefined, features: [], userErrors: errors };
    }

    // 3. Удалить лишние features (которых нет в input)
    const keepIds = features.filter((f) => f.id).map((f) => f.id as string);
    await this.repository.feature.deleteExcept(productId, keepIds);

    // 4. Создать новые группы и построить clientId → id map
    const clientIdMap = await this.createNewGroups(productId, features);

    // 5. Резолвить parentId и нормализовать sortIndex
    const resolved = this.resolveAndNormalize(features, clientIdMap);

    // 6. Upsert все features
    for (const item of resolved) {
      await this.upsertFeature(productId, item);
    }

    // 7. Sync values для атрибутов
    for (const item of resolved.filter((f) => !f.isGroup && f.resolvedId)) {
      await this.syncValues(item.resolvedId!, item.values ?? []);
    }

    // 8. Вернуть результат
    const [product, syncedFeatures] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.feature.findByProductId(productId),
    ]);

    return { product: product ?? undefined, features: syncedFeatures, userErrors: [] };
  }

  private validateInput(features: FeatureSyncItemInput[]): UserError[] {
    const errors: UserError[] = [];
    const seenIds = new Set<string>();
    const seenClientIds = new Set<string>();
    const clientIdToItem = new Map<string, FeatureSyncItemInput>();

    for (const [i, f] of features.entries()) {
      const path = (field: string) => ["features", String(i), field];

      if (f.id && seenIds.has(f.id)) {
        errors.push({ message: "Duplicate id", field: path("id"), code: "DUPLICATE" });
      }
      if (f.id) seenIds.add(f.id);

      if (f.clientId && seenClientIds.has(f.clientId)) {
        errors.push({ message: "Duplicate clientId", field: path("clientId"), code: "DUPLICATE" });
      }
      if (f.clientId) {
        seenClientIds.add(f.clientId);
        clientIdToItem.set(f.clientId, f);
      }

      if (f.isGroup && (f.parentId || f.parentClientId)) {
        errors.push({ message: "Groups cannot have parent", field: path("parentId"), code: "INVALID" });
      }

      if (f.isGroup && f.values?.length) {
        errors.push({ message: "Groups cannot have values", field: path("values"), code: "INVALID" });
      }

      if (f.parentId && f.parentClientId) {
        errors.push({ message: "Use parentId or parentClientId, not both", field: path("parentId"), code: "INVALID" });
      }

      // Validate parentClientId references
      if (f.parentClientId) {
        const parent = clientIdToItem.get(f.parentClientId);
        if (!parent) {
          errors.push({ message: "parentClientId not found", field: path("parentClientId"), code: "NOT_FOUND" });
        } else if (!parent.isGroup) {
          errors.push({ message: "Parent must be a group", field: path("parentClientId"), code: "INVALID" });
        }
      }
    }

    return errors;
  }

  private async createNewGroups(
    productId: string,
    features: FeatureSyncItemInput[]
  ): Promise<Map<string, string>> {
    const clientIdMap = new Map<string, string>();

    for (const group of features.filter((f) => f.isGroup && !f.id)) {
      const created = await this.repository.feature.create(productId, {
        isGroup: true,
        parentId: null,
        sortIndex: 0,
      });
      group.id = created.id;
      if (group.clientId) clientIdMap.set(group.clientId, created.id);
    }

    return clientIdMap;
  }

  private resolveAndNormalize(
    features: FeatureSyncItemInput[],
    clientIdMap: Map<string, string>
  ): ResolvedItem[] {
    const resolved: ResolvedItem[] = features.map((f, i) => ({
      ...f,
      resolvedId: f.id ?? undefined,
      resolvedParentId: f.isGroup ? null : (f.parentId ?? clientIdMap.get(f.parentClientId!) ?? null),
      sortIndex: f.sortIndex ?? i,
    }));

    // Нормализуем sortIndex по контейнерам
    const byContainer = new Map<string, ResolvedItem[]>();
    for (const item of resolved) {
      const key = item.resolvedParentId ?? "__root__";
      const list = byContainer.get(key) ?? [];
      list.push(item);
      byContainer.set(key, list);
    }

    for (const items of byContainer.values()) {
      items.sort((a, b) => a.sortIndex - b.sortIndex);
      items.forEach((item, idx) => (item.sortIndex = idx));
    }

    return resolved;
  }

  private async upsertFeature(productId: string, item: ResolvedItem): Promise<void> {
    const data = {
      isGroup: item.isGroup ?? false,
      parentId: item.resolvedParentId,
      sortIndex: item.sortIndex,
    };

    if (item.resolvedId) {
      await this.repository.feature.update(item.resolvedId, data);
    } else {
      const created = await this.repository.feature.create(productId, data);
      item.resolvedId = created.id;
    }

    await this.repository.translation.upsertFeatureTranslation({
      projectId: this.getProjectId(),
      featureId: item.resolvedId!,
      locale: this.getLocale(),
      name: item.name,
    });
  }

  private async syncValues(featureId: string, values: FeatureValueSyncInput[]): Promise<void> {
    const keepIds = values.filter((v) => v.id).map((v) => v.id as string);
    await this.repository.feature.deleteValuesExcept(featureId, keepIds);

    const sorted = [...values].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

    for (const [index, value] of sorted.entries()) {
      if (value.id) {
        await this.repository.feature.updateValue(value.id, { sortIndex: index });
      } else {
        const created = await this.repository.feature.createValue(featureId, { sortIndex: index });
        value.id = created.id;
      }

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: value.id!,
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

## 6. Что удалить

После рефакторинга удалить:
- `offsetSortIndexes()` из FeatureRepository
- Все проверки на `slug` в валидации
- `seenSlugs` логику из FeaturesSyncScript

---

## Сравнение

| Метрика | До | После |
|---------|-----|-------|
| Строк кода | ~500 | ~100 |
| Unique constraints | 3 | 0 |
| Two-phase updates | Да | Нет |
| Temp slugs | Да | Нет |
| Edge cases | Много | Нет |
| Колонки в БД | 6 + 4 | 5 + 3 |

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

1. [ ] Создать миграцию `0005_remove_feature_slug.sql`
2. [ ] Обновить модель `features.ts` (удалить slug везде)
3. [ ] Обновить GraphQL schema (удалить slug везде)
4. [ ] Обновить FeatureResolver (удалить slug метод)
5. [ ] Обновить FeatureValueResolver (удалить slug метод)
6. [ ] Добавить методы `deleteExcept`, `deleteValuesExcept` в repository
7. [ ] Переписать `FeaturesSyncScript.ts`
8. [ ] Обновить DTO (удалить slug из input)
9. [ ] Удалить `offsetSortIndexes` из repository
10. [ ] Запустить тесты
11. [ ] Применить миграцию
