# План рефакторинга drizzle-query

## Цель

1. **Операторы фильтров**: заменить `$` на `_` (`$eq` → `_eq`, `$contains` → `_contains`)
2. **Сортировки**: заменить строки `"field:asc"` на объекты `{ field: "title", order: "asc" }`
3. **Убрать маппинг GraphQL**: валидация происходит только внутри `query.execute()`

## Изменения по файлам

### 1. `src/operators.ts`

**Текущее состояние:**
```typescript
export const OPERATORS = {
  $eq: "eq",
  $neq: "neq",
  $gt: "gt",
  // ...
}

export function isOperator(key: string): key is OperatorKey {
  return key.startsWith("$") && key in OPERATORS;
}
```

**Изменения:**
- Переименовать все операторы с `$` на `_`:
  - `$eq` → `_eq`
  - `$neq` → `_neq`
  - `$gt` → `_gt`
  - `$gte` → `_gte`
  - `$lt` → `_lt`
  - `$lte` → `_lte`
  - `$in` → `_in`
  - `$notIn` → `_notIn`
  - `$is` → `_is`
  - `$isNot` → `_isNot`
  - `$contains` → `_contains`
  - `$notContains` → `_notContains`
  - `$containsi` → `_containsi`
  - `$notContainsi` → `_notContainsi`
  - `$startsWith` → `_startsWith`
  - `$startsWithi` → `_startsWithi`
  - `$endsWith` → `_endsWith`
  - `$endsWithi` → `_endsWithi`
  - `$between` → `_between`

- Обновить `isOperator()`: проверка `key.startsWith("_")`
- Обновить `isLogicalOperator()`: `_and`, `_or`, `_not`
- Обновить `buildOperatorCondition()`: удалить `_` вместо `$`

---

### 2. `src/types.ts`

**Изменения в `FilterOperators<T>`:**
```typescript
// Было:
export type FilterOperators<T = ScalarValue> = {
  $eq?: T;
  $neq?: T;
  // ...
};

// Станет:
export type FilterOperators<T = ScalarValue> = {
  _eq?: T;
  _neq?: T;
  _gt?: T;
  _gte?: T;
  _lt?: T;
  _lte?: T;
  _in?: T[];
  _notIn?: T[];
  _is?: null;
  _isNot?: null;
  _contains?: string;
  _notContains?: string;
  _containsi?: string;
  _notContainsi?: string;
  _startsWith?: string;
  _startsWithi?: string;
  _endsWith?: string;
  _endsWithi?: string;
  _between?: [T, T];
};
```

**Изменения в `NestedWhereInput<T>`:**
```typescript
// Было:
} & {
  $and?: NestedWhereInput<T>[];
  $or?: NestedWhereInput<T>[];
  $not?: NestedWhereInput<T>;
};

// Станет:
} & {
  _and?: NestedWhereInput<T>[];
  _or?: NestedWhereInput<T>[];
  _not?: NestedWhereInput<T>;
};
```

**Новый тип для сортировки:**
```typescript
/**
 * Order input item - object-based sort specification
 * field может содержать путь с точками для вложенных полей: "items.product.price"
 */
export type OrderByItem<F extends string = string> = {
  field: F;
  order: OrderDirection;
  nulls?: NullsOrder;
};
```

**Примеры вложенных полей:**
```typescript
// Вложенные поля (nested fields) - field содержит путь с точками:
order: [
  { field: "items.product.price", order: "desc" },
  { field: "translation.value", order: "asc" },
  { field: "events.createdAt", order: "desc" }
]
// OrderBuilder разбирает field.split(".") и создаёт нужные JOIN-ы
```

**Удалить `OrderPath`** (больше не нужен):
```typescript
// Удалить:
export type OrderPath<F extends string> = F | `${F}:${"asc" | "desc"}`;
```

---

### 3. `src/builder/fluent-types.ts`

**Изменения в `ExecuteOptions`:**
```typescript
// Было:
export type ExecuteOptions<Fields extends FieldsDef> = {
  where?: NestedWhereInput<Fields>;
  order?: OrderPath<NestedPaths<Fields>>[];
  // ...
};

// Станет:
export type ExecuteOptions<Fields extends FieldsDef> = {
  where?: NestedWhereInput<Fields>;
  order?: OrderByItem<NestedPaths<Fields>>[];
  // ...
};
```

**Изменения в `FluentQueryConfig`:**
```typescript
// Было:
defaultOrder?: OrderPath<NestedPaths<Fields>>;

// Станет:
defaultOrder?: OrderByItem<NestedPaths<Fields>>;
```

---

### 4. `src/builder/order-builder.ts`

**Полный рефакторинг:**

```typescript
// Было:
build(orders: string[] | undefined | null): SQL | undefined

// Станет:
build(orders: OrderByItem<string>[] | undefined | null): SQL | undefined
```

**Удалить `parseOrder()`** - больше не нужен, данные уже в нужном формате.

**Обновить основной метод:**
```typescript
build(orders: OrderByItem<string>[] | undefined | null): SQL | undefined {
  if (!orders || orders.length === 0) {
    return undefined;
  }

  this.joinCollector.ensureMainAlias(this.schema.tableName);

  const parts: SQL[] = [];
  for (const orderItem of orders) {
    const resolved = this.resolveOrderField(
      orderItem.field.split("."),
      this.schema,
      0,
      orderItem.order,
      orderItem.nulls
    );
    if (resolved) {
      parts.push(resolved);
    }
  }

  return parts.length > 0 ? sql.join(parts, sql`, `) : undefined;
}
```

**Добавить поддержку `nulls`:**
```typescript
private buildOrderExpression(
  fieldConfig: FieldConfig,
  tableAlias: string,
  direction: OrderDirection,
  nulls?: NullsOrder
): SQL {
  const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
  const colSql = sql`${sql.identifier(tableAlias)}.${sql.identifier(fieldConfig.column)} ${dirSql}`;

  if (nulls === "first") {
    return sql`${colSql} NULLS FIRST`;
  } else if (nulls === "last") {
    return sql`${colSql} NULLS LAST`;
  }

  return colSql;
}
```

---

### 5. `src/builder/where-builder.ts`

**Обновить обработку логических операторов:**
- `$and` → `_and`
- `$or` → `_or`
- `$not` → `_not`

---

### 6. `src/graphql-mapper.ts` - УДАЛИТЬ

**Файл удаляется полностью.** Вся валидация переносится в `execute()`.

---

### 7. `src/builder/fluent-query-builder.ts` - добавить валидацию

**Добавить валидацию в `resolveOptions()` или отдельный метод `validateInput()`:**

```typescript
// Новые ошибки (добавить в errors.ts):
export class InvalidFieldError extends QueryBuilderError {
  constructor(field: string, context: "where" | "order" | "select") {
    super(`Invalid ${context} field: "${field}"`, "INVALID_FIELD");
  }
}

export class InvalidOperatorError extends QueryBuilderError {
  constructor(operator: string, field: string) {
    super(`Invalid operator "${operator}" for field "${field}"`, "INVALID_OPERATOR");
  }
}

// В FluentQueryBuilder добавить:
private validateInput(options: ExecuteOptions<InferredFields>): void {
  const allowedFields = this.getAllowedFields(); // все поля включая вложенные пути
  const allowedOperators = new Set([
    "_eq", "_neq", "_gt", "_gte", "_lt", "_lte",
    "_in", "_notIn", "_is", "_isNot",
    "_contains", "_notContains", "_containsi", "_notContainsi",
    "_startsWith", "_startsWithi", "_endsWith", "_endsWithi",
    "_between"
  ]);

  // Валидация order
  if (options.order) {
    for (const item of options.order) {
      if (!allowedFields.has(item.field)) {
        throw new InvalidFieldError(item.field, "order");
      }
    }
  }

  // Валидация select
  if (options.select) {
    for (const field of options.select) {
      if (!allowedFields.has(field)) {
        throw new InvalidFieldError(field, "select");
      }
    }
  }

  // Валидация where (рекурсивно)
  if (options.where) {
    this.validateWhere(options.where, allowedFields, allowedOperators);
  }
}

private validateWhere(
  where: Record<string, unknown>,
  allowedFields: Set<string>,
  allowedOperators: Set<string>,
  path: string = ""
): void {
  for (const [key, value] of Object.entries(where)) {
    if (key === "_and" || key === "_or") {
      if (Array.isArray(value)) {
        for (const item of value) {
          this.validateWhere(item, allowedFields, allowedOperators, path);
        }
      }
    } else if (key === "_not") {
      if (typeof value === "object" && value !== null) {
        this.validateWhere(value as Record<string, unknown>, allowedFields, allowedOperators, path);
      }
    } else if (typeof value === "object" && value !== null) {
      const fullPath = path ? `${path}.${key}` : key;

      // Проверяем, это вложенный объект (relation) или объект с операторами
      const keys = Object.keys(value);
      const hasOperators = keys.some(k => k.startsWith("_"));

      if (hasOperators) {
        // Это поле с операторами - валидируем поле и операторы
        if (!allowedFields.has(fullPath)) {
          throw new InvalidFieldError(fullPath, "where");
        }
        for (const op of keys) {
          if (!allowedOperators.has(op)) {
            throw new InvalidOperatorError(op, fullPath);
          }
        }
      } else {
        // Это вложенный объект (relation) - рекурсивно валидируем
        this.validateWhere(value as Record<string, unknown>, allowedFields, allowedOperators, fullPath);
      }
    } else {
      // Прямое значение (shorthand для _eq)
      const fullPath = path ? `${path}.${key}` : key;
      if (!allowedFields.has(fullPath)) {
        throw new InvalidFieldError(fullPath, "where");
      }
    }
  }
}

private getAllowedFields(): Set<string> {
  // Собираем все пути из FieldsDef рекурсивно
  const fields = new Set<string>();
  this.collectFieldPaths(this.getFieldsDef(), "", fields);
  return fields;
}

private collectFieldPaths(def: FieldsDef, prefix: string, result: Set<string>): void {
  for (const [key, value] of Object.entries(def)) {
    const path = prefix ? `${prefix}.${key}` : key;
    result.add(path);
    if (typeof value === "object" && value !== true) {
      this.collectFieldPaths(value, path, result);
    }
  }
}
```

**Вызов валидации в execute():**
```typescript
async execute(db: DrizzleExecutor, options?: ExecuteOptions<InferredFields>) {
  // Валидация входных данных
  if (options) {
    this.validateInput(options);
  }

  // ... остальная логика
}
```

---

### 8. `src/cursor/sort.ts`

**Обновить `parseSort` и `SortParam`:**

```typescript
// Было:
export type SortParam = {
  path: string;
  direction: "ASC" | "DESC";
};

// parseSort парсил строку "field:asc"

// Станет:
// parseSort принимает OrderByItem[] и просто нормализует направление
```

---

### 9. `src/cursor/base-builder.ts`

**Обновить типы для cursor pagination:**
- `parseSortOrder` → принимает `OrderByItem[]`
- `buildOrderPath` → работает с объектами

---

### 10. `src/cursor/relay-builder.ts`

**Обновить `RelayInput`:**
```typescript
// Было:
order?: string[];

// Станет:
order?: OrderByItem<string>[];
```

---

### 11. Тестовые файлы

**`src/__tests__/sql.test.ts`:**
```typescript
// Было:
order: ["name:asc", "age:desc"]

// Станет:
order: [
  { field: "name", order: "asc" },
  { field: "age", order: "desc" }
]
```

**`src/__tests__/sql-snapshots.test.ts` (вложенные поля):**
```typescript
// Было:
order: ["translation.value:asc", "translation.searchValue:desc"]
order: ["events.createdAt:desc"]
order: ["items.quantity:desc"]

// Станет:
order: [
  { field: "translation.value", order: "asc" },
  { field: "translation.searchValue", order: "desc" }
]
order: [{ field: "events.createdAt", order: "desc" }]
order: [{ field: "items.quantity", order: "desc" }]
```

**`src/__tests__/cursor/sort.test.ts`:**
Обновить тесты для нового формата.

---

## Порядок выполнения

1. **Типы** (`types.ts`, `fluent-types.ts`) - изменить типы операторов и сортировок
2. **Операторы** (`operators.ts`) - переименовать `$` → `_`
3. **Where Builder** (`where-builder.ts`) - обновить логические операторы
4. **Order Builder** (`order-builder.ts`) - принимать объекты вместо строк
5. **Fluent Query Builder** (`fluent-query-builder.ts`) - добавить валидацию полей/операторов
6. **Cursor builders** (`sort.ts`, `base-builder.ts`, `relay-builder.ts`) - обновить сортировки
7. **Удалить GraphQL Mapper** (`graphql-mapper.ts`) - файл больше не нужен
8. **Тесты** - обновить все тестовые данные, удалить тесты graphql-mapper

---

## Пример использования после рефакторинга

```typescript
// Query execution - простые поля
const result = await warehouseQuery.execute(db, {
  where: {
    name: { _contains: "test" },
    isDefault: { _eq: true },
    _or: [
      { code: { _eq: "WH1" } },
      { code: { _eq: "WH2" } }
    ]
  },
  order: [
    { field: "createdAt", order: "desc" },
    { field: "name", order: "asc" }
  ],
  limit: 20
});

// Query execution - вложенные поля (nested fields)
const orders = await ordersQuery.execute(db, {
  where: {
    status: { _eq: "completed" },
    items: {
      product: {
        category: { _eq: "electronics" }
      }
    }
  },
  order: [
    { field: "items.product.price", order: "desc" },  // сортировка по вложенному полю
    { field: "createdAt", order: "desc" }
  ],
  limit: 50
});

// GraphQL resolver - входные данные передаются напрямую в execute()
// Валидация происходит внутри execute()
const result = await warehouseQuery.execute(db, {
  where: { name: { _contains: "test" } },
  order: [{ field: "createdAt", order: "desc" }],
  limit: 20
});

// Ошибки валидации:
// InvalidFieldError: Invalid where field: "unknownField"
// InvalidOperatorError: Invalid operator "_invalid" for field "name"
```

---

## Преимущества

1. **Нет маппинга** - GraphQL input напрямую совместим с query.execute()
2. **Type-safe сортировка** - объекты вместо строк, TypeScript проверяет поля
3. **Поддержка nulls** - объектный формат легко расширить для `NULLS FIRST/LAST`
4. **Валидация в одном месте** - вся проверка внутри execute(), не нужен отдельный mapper
5. **Меньше кода** - удаляется graphql-mapper.ts полностью
