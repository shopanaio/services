# План рефакторинга Cursor API

## Проблема

Текущий API слишком сложный — 4 шага для простого запроса:

```ts
// Текущий API (плохо)
const query = prepareQuery({ first, after, sort, ... });
const rows = await qb.query(db, { where, order, limit });
const nodes = rows.map(row => createCursorNode({ row, ... }));
return makeConnection({ nodes, ... });
```

## Решение

Один unified API — `createCursorQueryBuilder`:

```ts
// Новый API (хорошо)
const qb = createCursorQueryBuilder(productSchema, {
  cursorType: "product",
  tieBreaker: "id",
  defaultSortField: "createdAt",
  getId: (row) => row.id,
  getValue: (row, field) => row[field],
});

const connection = await qb.query(db, {
  first: 10,
  after: cursor,
  where: { status: { $eq: "ACTIVE" } },
  order: ["price:desc"],
});
```

## Новая структура файлов

```
src/cursor/
├── builder.ts       # NEW: createCursorQueryBuilder (главный API)
├── cursor.ts        # encode/decode/validate (internal)
├── helpers.ts       # hashFilters, snakeToCamel, etc (internal)
├── sort.ts          # parseSort (internal)
├── where.ts         # buildCursorWhereInput (internal)
├── connection.ts    # makeConnection, types (internal)
├── index.ts         # реэкспорт только публичного API
└── cursor.test.ts   # тесты
```

## Публичный API (index.ts)

```ts
// Главный API
export { createCursorQueryBuilder } from "./builder.js";
export type {
  CursorQueryBuilderConfig,
  CursorQueryInput,
  CursorQueryResult,
} from "./builder.js";

// Типы для Connection
export type { Connection, Edge, PageInfo } from "./connection.js";

// Ошибки
export { InvalidCursorError } from "./cursor.js";

// Low-level (для продвинутых случаев)
export { encode, decode } from "./cursor.js";
export { hashFilters } from "./helpers.js";
```

## Что убираем из публичного API

- `prepareQuery` — заменён на `createCursorQueryBuilder`
- `createCursorNode` — используется только внутри
- `makeConnection` — используется только внутри
- `createCursorConfig` — не нужен
- `parseSort` — internal
- `buildCursorWhereInput` — internal

## Input типы

```ts
type CursorQueryInput<F extends FieldsDef> = {
  // Пагинация (Relay)
  first?: number;
  after?: string;
  last?: number;
  before?: string;

  // Стандартный toolkit формат
  where?: NestedWhereInput<F>;
  order?: OrderPath<NestedPaths<F>>[];
  select?: NestedPaths<F>[];

  // Опционально: фильтры для хеша
  filters?: Record<string, unknown>;
};
```

## Output типы

```ts
type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount?: number;
};

type Edge<T> = {
  cursor: string;
  node: T;
};

type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

type CursorQueryResult<T> = Connection<T> & {
  filtersChanged: boolean;
};
```

## Конфиг

```ts
type CursorQueryBuilderConfig<S, Row> = {
  // Обязательные
  cursorType: string;                    // "product"
  tieBreaker: NestedPaths<S["__fields"]>; // "id"
  defaultSortField: NestedPaths<S["__fields"]>; // "createdAt"
  getId: (row: Row) => string;
  getValue: (row: Row, field: string) => unknown;

  // Опциональные
  mapResult?: (row: Row) => unknown;     // трансформация результата
  queryConfig?: QueryBuilderConfig;       // maxLimit, defaultLimit, etc
};
```

## Внутренняя логика query()

```ts
async query(db, input) {
  // 1. Валидация first/last
  // 2. Парсинг order → sortParams
  // 3. hashFilters(input.filters)
  // 4. Декодирование cursor (after/before)
  // 5. Проверка cursor type
  // 6. Проверка filtersHash → filtersChanged
  // 7. validateCursorOrder
  // 8. buildCursorWhereInput
  // 9. Merge: input.where + cursorWhere
  // 10. Build order с tieBreaker (+ invert если last без before)
  // 11. Execute: qb.query(db, { where, order, limit: limit + 1 })
  // 12. createCursorNode для каждого row
  // 13. makeConnection
  // 14. Return connection + filtersChanged
}
```

## Шаги рефакторинга

1. [x] Создать `builder.ts` с `createCursorQueryBuilder`
2. [x] Написать тесты для нового API
3. [x] Обновить `index.ts` — экспортировать только публичный API
4. [x] Обновить README
5. [x] Пометить старые функции как deprecated (или удалить)

## Пример использования

```ts
import { createSchema, createCursorQueryBuilder } from "@shopana/drizzle-gql-toolkit";

// Схема
const productSchema = createSchema({
  table: products,
  tableName: "products",
  fields: {
    id: { column: "id" },
    title: { column: "title" },
    price: { column: "price" },
    status: { column: "status" },
    createdAt: { column: "created_at" },
  },
});

// Query Builder с cursor поддержкой
const productQB = createCursorQueryBuilder(productSchema, {
  cursorType: "product",
  tieBreaker: "id",
  defaultSortField: "createdAt",
  getId: (row) => row.id,
  getValue: (row, field) => row[field as keyof typeof row],
});

// В резолвере
async function products(db, input: ProductsInput) {
  const connection = await productQB.query(db, {
    first: input.first,
    after: input.after,
    where: input.filter,
    order: input.sort ? [input.sort] : undefined,
  });

  // Если нужен totalCount
  if (needsTotalCount) {
    const total = await productQB.count(db, input.filter);
    return { ...connection, totalCount: total };
  }

  return connection;
}
```
