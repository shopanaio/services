# План портирования cursor пакета

## Обзор

Портирование `platform/pkg/cursor` → `packages/drizzle-gql-toolkit/src/cursor/`

Toolkit уже имеет:
- `NestedWhereInput` с операторами `$eq`, `$gt`, `$lt`, `$or`, `$and`
- `QueryBuilder` с `where()`, `fromInput()`, `query()`
- `OrderPath` для сортировки `["field:asc", "field:desc"]`

Go cursor пакет добавит seek/keyset пагинацию.

---

## Структура файлов

```
src/cursor/
├── cursor.ts      # SeekValue, CursorParams, encode/decode, validateCursorParams
├── helpers.ts     # snakeToCamel, tieBreakerOrder, SortParam, hashFilters
├── sort.ts        # parseSort, validateCursorOrder
├── where.ts       # buildCursorWhereInput (лексикографическая лестница)
├── connection.ts  # Edge, Connection, makeConnection
├── query.ts       # prepareQuery (объединяет всё)
├── config.ts      # createCursorConfig — фабрика с типами из схемы
└── index.ts       # реэкспорт
```

---

## 1. `cursor.ts` — Типы и кодирование

```typescript
import type { OrderDirection } from '../types.js';  // "asc" | "desc"

export type SeekValue = {
  field: string;
  value: unknown;
  order: OrderDirection;
};

export type CursorParams = {
  type: string;
  filtersHash: string;  // хеш от filters для проверки изменений
  seek: SeekValue[];
};

export class InvalidCursorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

// ============ Валидация ============

export function validateCursorParams(params: CursorParams): void {
  if (!params) throw new InvalidCursorError('Cursor params cannot be null');
  if (!params.type?.trim()) throw new InvalidCursorError('Cursor type cannot be empty');
  if (typeof params.filtersHash !== 'string') throw new InvalidCursorError('Filters hash must be a string');
  if (!params.seek?.length) throw new InvalidCursorError('Seek values cannot be empty');

  for (let i = 0; i < params.seek.length; i++) {
    const sv = params.seek[i];
    if (!sv.field?.trim()) {
      throw new InvalidCursorError(`Field cannot be empty at index ${i}`);
    }
    if (sv.order !== 'asc' && sv.order !== 'desc') {
      throw new InvalidCursorError(`Invalid order '${sv.order}' at index ${i}`);
    }
  }
}

// ============ Кодирование ============

/**
 * Encode cursor params to base64url string (URL-safe, no padding)
 */
export function encode(params: CursorParams): string {
  validateCursorParams(params);
  const json = JSON.stringify(params);

  // Node.js
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64url');
  }

  // Browser
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode base64url cursor string to params
 */
export function decode(cursor: string): CursorParams {
  if (!cursor?.trim()) {
    throw new InvalidCursorError('Cursor string is empty');
  }

  let json: string;
  try {
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(cursor, 'base64url').toString('utf-8');
    } else {
      // Browser: restore padding for atob
      const padded = cursor
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(cursor.length + (4 - (cursor.length % 4)) % 4, '=');
      json = atob(padded);
    }
  } catch (err) {
    throw new InvalidCursorError('Failed to decode base64', err);
  }

  let params: CursorParams;
  try {
    params = JSON.parse(json);
  } catch (err) {
    throw new InvalidCursorError('Failed to parse JSON', err);
  }

  validateCursorParams(params);
  return params;
}
```

---

## 2. `helpers.ts` — Вспомогательные функции

```typescript
import type { OrderDirection } from '../types.js';

export type SortParam = {
  field: string;
  order: OrderDirection;  // "asc" | "desc"
};

export function snakeToCamel(s: string): string;
export function cloneSortParams(params: SortParam[]): SortParam[];
export function tieBreakerOrder(sortParams: SortParam[]): OrderDirection;
export function buildTieBreakerSeekValue(input: BuildTieBreakerInput): SeekValue;
export function invertOrder(order: OrderDirection): OrderDirection;

/**
 * Создаёт хеш от объекта фильтров для сравнения.
 * Используется для проверки изменения фильтров между запросами.
 */
export function hashFilters(filters: Record<string, unknown> | undefined): string {
  if (!filters || Object.keys(filters).length === 0) {
    return '';
  }
  // Сортируем ключи для детерминированности
  const sorted = Object.keys(filters).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sorted) {
    normalized[key] = filters[key];
  }
  const json = JSON.stringify(normalized);

  // Простой хеш: base64url первые 16 символов
  // Для production можно использовать FNV-1a или xxHash
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf-8').toString('base64url').slice(0, 16);
  }
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 16);
}
```

---

## 3. `sort.ts` — Парсинг сортировки

```typescript
// "UPDATED_AT_DESC,TITLE_ASC" → [{ field: "updatedAt", order: "DESC" }, ...]
export function parseSort(
  sort: string | undefined,
  defaultField: string,
  mapper?: (field: string) => string
): SortParam[];

export function validateCursorOrder(
  cursor: CursorParams,
  sort: SortParam[],
  tieBreaker: string
): void;
```

---

## 4. `where.ts` — Генерация WHERE для курсора

Строит "лексикографическую лестницу" для seek-пагинации.

### Алгоритм

Для `seek = [{ field: "updatedAt", value: v1, order: "desc" }, { field: "id", value: v2, order: "desc" }]`:

**Forward (after):**
```
WHERE (updatedAt < v1)
   OR (updatedAt = v1 AND id < v2)
```

**Backward (before):**
```
WHERE (updatedAt > v1)
   OR (updatedAt = v1 AND id > v2)
```

### Реализация

```typescript
import type { NestedWhereInput, FieldsDef, FilterOperators } from '../types.js';
import type { CursorParams } from './cursor.js';

/**
 * Определяет оператор сравнения в зависимости от направления и порядка сортировки.
 *
 * forward + desc → $lt (следующие элементы меньше)
 * forward + asc  → $gt (следующие элементы больше)
 * backward + desc → $gt
 * backward + asc  → $lt
 */
function getComparisonOperator(
  forward: boolean,
  order: 'asc' | 'desc'
): '$lt' | '$gt' {
  if (forward) {
    return order === 'desc' ? '$lt' : '$gt';
  } else {
    return order === 'desc' ? '$gt' : '$lt';
  }
}

/**
 * Строит WHERE условие для cursor-based пагинации.
 *
 * Реализует "лексикографическую лестницу":
 * { $or: [
 *   { a: { $lt: v1 } },
 *   { a: { $eq: v1 }, b: { $lt: v2 } },
 *   { a: { $eq: v1 }, b: { $eq: v2 }, c: { $lt: v3 } }
 * ]}
 */
export function buildCursorWhereInput<F extends FieldsDef = FieldsDef>(
  params: CursorParams,
  forward: boolean
): NestedWhereInput<F> {
  const { seek } = params;

  if (!seek || seek.length === 0) {
    return {} as NestedWhereInput<F>;
  }

  const orConditions: NestedWhereInput<F>[] = [];

  for (let i = 0; i < seek.length; i++) {
    const sv = seek[i];
    const condition: Record<string, FilterOperators> = {};

    // Все предыдущие поля должны быть равны
    for (let j = 0; j < i; j++) {
      const prev = seek[j];
      condition[prev.field] = { $eq: prev.value };
    }

    // Текущее поле сравнивается с оператором < или >
    const op = getComparisonOperator(forward, sv.order);
    condition[sv.field] = { [op]: sv.value };

    orConditions.push(condition as NestedWhereInput<F>);
  }

  return { $or: orConditions } as NestedWhereInput<F>;
}
```

### Пример результата

```typescript
const cursor: CursorParams = {
  type: 'category',
  filtersHash: 'abc123',  // хеш от фильтров
  seek: [
    { field: 'updatedAt', value: '2024-01-15T10:00:00Z', order: 'desc' },
    { field: 'id', value: 'abc-123', order: 'desc' }
  ]
};

buildCursorWhereInput(cursor, true);
// Результат:
// {
//   $or: [
//     { updatedAt: { $lt: '2024-01-15T10:00:00Z' } },
//     { updatedAt: { $eq: '2024-01-15T10:00:00Z' }, id: { $lt: 'abc-123' } }
//   ]
// }
```

---

## 5. `connection.ts` — Relay Connection

```typescript
export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

export type Edge<T> = {
  cursor: string;
  node: T;
};

export type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
};

export interface CursorNode {
  getId(): string;
  getCursorType(): string;
  getSeekValues(): SeekValue[];
}

export type PagingInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  totalCount: number;
};

export type MakeConnectionInput<T extends CursorNode, K> = {
  nodes: T[];
  mapper: (node: T) => K;
  paging: PagingInput;
  filtersHash: string;         // хеш от текущих фильтров
  sortParams: SortParam[];
  tieBreaker: string;
  invertOrder?: boolean;       // true когда order был инвертирован (last без before)
};

export function makeConnection<T extends CursorNode, K>(
  input: MakeConnectionInput<T, K>
): Connection<K>;
```

---

## 6. `query.ts` — Подготовка запроса

Возвращает данные совместимые с `TypedInput`:

```typescript
export type PrepareQueryArgs = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  sort?: string;              // "UPDATED_AT_DESC" или "createdAt:desc"
  filters?: Record<string, unknown>;  // текущие фильтры для вычисления хеша
  defaultField: string;
  tieBreaker: string;
  mapper?: (field: string) => string;
};

export type PreparedQuery<F extends FieldsDef> = {
  // Совместимо с TypedInput:
  where: NestedWhereInput<F> | null;
  order: string[];              // ["updatedAt:desc", "id:desc"] — OrderPath формат
  limit: number;

  // Дополнительно для connection:
  sortParams: SortParam[];
  filtersHash: string;          // хеш от текущих фильтров
  selection: string[];          // поля нужные для курсора
  isForward: boolean;
  invertOrder: boolean;         // для last без before — order инвертирован
  filtersChanged: boolean;      // true если курсор был проигнорирован из-за изменения фильтров
};

export function prepareQuery<F extends FieldsDef>(
  args: PrepareQueryArgs
): PreparedQuery<F>;
```

---

## 7. `config.ts` — Фабрика конфигурации с типами из схемы

```typescript
import type { Table } from 'drizzle-orm';
import type { ObjectSchema } from '../schema.js';
import type { FieldsDef, NestedPaths, OrderDirection } from '../types.js';
import type { SeekValue, CursorParams } from './cursor.js';
import type { SortParam } from './helpers.js';

/**
 * Конфигурация курсорной пагинации с выводом типов из схемы
 */
export type CursorConfig<
  S extends ObjectSchema<Table, string, FieldsDef, unknown>
> = {
  /** Схема для вывода типов полей */
  schema: S;
  /** Тип курсора (например, 'category', 'product') */
  cursorType: string;
  /** Поле-тайбрейкер (обычно 'id') */
  tieBreaker: NestedPaths<S['__fields']>;
  /** Поле по умолчанию для сортировки */
  defaultSortField: NestedPaths<S['__fields']>;
  /**
   * Опциональный маппер для кастомных имён полей.
   * По умолчанию используется snakeToCamel:
   * "UPDATED_AT_DESC" → "updatedAt"
   */
  fieldMapper?: (field: string) => NestedPaths<S['__fields']>;
};

/**
 * Типизированный геттер значений для seek
 */
export type SeekValueGetter<
  S extends ObjectSchema<Table, string, FieldsDef, unknown>,
  Row
> = (
  row: Row,
  field: NestedPaths<S['__fields']>,
  order: OrderDirection
) => unknown;

/**
 * Фабрика для создания cursor-хелперов с типами из схемы
 */
export function createCursorConfig<
  S extends ObjectSchema<Table, string, FieldsDef, unknown>,
  Row = S['__types']
>(config: CursorConfig<S>) {
  type Fields = S['__fields'];
  type FieldPath = NestedPaths<Fields>;

  return {
    /**
     * Парсит sort строку в типизированные SortParam[]
     */
    parseSort(sort: string | undefined): SortParam[] {
      // ... использует config.defaultSortField и config.sortFieldMap
    },

    /**
     * Создаёт типизированный SeekValue[] из row
     */
    buildSeekValues(
      row: Row,
      sortParams: SortParam[],
      getValue: SeekValueGetter<S, Row>
    ): SeekValue[] {
      const values: SeekValue[] = sortParams.map(p => ({
        field: p.field,
        value: getValue(row, p.field as FieldPath, p.order),
        order: p.order,
      }));

      // Добавляем tieBreaker
      values.push({
        field: config.tieBreaker,
        value: getValue(row, config.tieBreaker, tieBreakerOrder(sortParams)),
        order: tieBreakerOrder(sortParams),
      });

      return values;
    },

    /**
     * Кодирует cursor с типом из конфига
     */
    encode(
      row: Row,
      sortParams: SortParam[],
      getValue: SeekValueGetter<S, Row>,
      filtersHash: string
    ): string {
      const params: CursorParams = {
        type: config.cursorType,
        filtersHash,
        seek: this.buildSeekValues(row, sortParams, getValue),
      };
      return encode(params);
    },

    /**
     * Декодирует и валидирует cursor
     */
    decode(cursor: string): CursorParams {
      const params = decode(cursor);
      if (params.type !== config.cursorType) {
        throw new InvalidCursorError(
          `Expected cursor type '${config.cursorType}', got '${params.type}'`
        );
      }
      return params;
    },

    /**
     * Возвращает selection для запроса (поля нужные для курсора)
     */
    getSelection(sortParams: SortParam[]): FieldPath[] {
      const fields = new Set<FieldPath>();
      for (const p of sortParams) {
        fields.add(p.field as FieldPath);
      }
      fields.add(config.tieBreaker);
      return [...fields];
    },
  };
}
```

### Пример использования фабрики

```typescript
// Создаём конфигурацию с типами из схемы
const categoryCursor = createCursorConfig({
  schema: categorySchema,
  cursorType: 'category',
  tieBreaker: 'id',
  defaultSortField: 'updatedAt',
  // fieldMapper не нужен — по умолчанию snakeToCamel:
  // "UPDATED_AT_DESC" → "updatedAt"
});

// Типы выводятся автоматически из схемы:
// - tieBreaker: 'id' | 'title' | 'status' | 'createdAt' | 'updatedAt'
// - defaultSortField: 'id' | 'title' | 'status' | 'createdAt' | 'updatedAt'

// Использование в резолвере:
const sortParams = categoryCursor.parseSort(input.sort);  // "UPDATED_AT_DESC" → [{ field: 'updatedAt', order: 'desc' }]
const selection = categoryCursor.getSelection(sortParams); // ['updatedAt', 'id']
const filtersHash = hashFilters(input.filter);             // хеш от текущих фильтров

const rows = await qb.query(db, { select: selection, ... });

// Кодирование курсора для каждой строки
const cursors = rows.map(row =>
  categoryCursor.encode(row, sortParams, (row, field) => row[field], filtersHash)
);
```

### Кастомный маппер (если имена не совпадают)

```typescript
const productCursor = createCursorConfig({
  schema: productSchema,
  cursorType: 'product',
  tieBreaker: 'id',
  defaultSortField: 'createdAt',
  // Если GraphQL enum использует другие имена:
  fieldMapper: (field) => {
    const map: Record<string, string> = {
      'PRICE': 'priceAmount',      // PRICE_DESC → priceAmount
      'STOCK': 'inventoryCount',   // STOCK_ASC → inventoryCount
    };
    return map[field] ?? snakeToCamel(field);
  },
});
```

---

## 8. `index.ts` — Реэкспорт

```typescript
export * from './cursor.js';
export * from './helpers.js';
export * from './sort.js';
export * from './where.js';
export * from './connection.js';
export * from './query.js';
export * from './config.js';
```

---

## Конфигурация seek полей

Seek поля для курсора формируются автоматически из параметров:

```
sort="UPDATED_AT_DESC,TITLE_ASC" + tieBreaker="id"
                    ↓
sortParams = [
  { field: "updatedAt", order: "desc" },
  { field: "title", order: "asc" }
]
                    ↓
seek fields = ["updatedAt", "title", "id"]  // + tieBreaker в конце
                    ↓
selection = ["updatedAt", "title", "id"]    // для SELECT
                    ↓
order = ["updatedAt:desc", "title:asc", "id:asc"]  // tieBreaker order = last sort order
```

### Где что задаётся:

| Параметр | Откуда | Пример |
|----------|--------|--------|
| `sort` | GraphQL input | `"UPDATED_AT_DESC"` |
| `defaultField` | Конфиг резолвера | `"createdAt"` |
| `tieBreaker` | Конфиг резолвера | `"id"` |
| `mapper` | Опционально | `field => fieldAliases[field]` |

### Откуда берутся значения для курсора:

```typescript
// prepareQuery генерирует selection
prepared.selection = ["updatedAt", "title", "id"]

// Результат запроса содержит эти поля
const rows = await qb.query(db, { select: prepared.selection, ... })

// CursorNode читает значения из row
node.getSeekValues() → [
  { field: "updatedAt", value: row.updatedAt, order: "desc" },
  { field: "title", value: row.title, order: "asc" },
  { field: "id", value: row.id, order: "asc" }  // tieBreaker
]

// Эти значения кодируются в cursor
encode({ type: "product", filtersHash: "abc123", seek: [...] })
```

---

## Интеграция с QueryBuilder

После порта можно использовать так:

```typescript
import { createQueryBuilder, createSchema } from 'drizzle-gql-toolkit';
import { prepareQuery, makeConnection, type CursorNode } from 'drizzle-gql-toolkit/cursor';

// 1. Подготовка запроса (возвращает данные совместимые с TypedInput)
const prepared = prepareQuery({
  first: input.first,
  after: input.after,
  last: input.last,
  before: input.before,
  sort: input.sort,         // "UPDATED_AT_DESC" или "createdAt:desc"
  defaultField: 'createdAt',
  tieBreaker: 'id',
});

// 2. Выполнение с QueryBuilder — prepared.order уже в формате OrderPath[]
const qb = createQueryBuilder(schema);
const rows = await qb.query(db, {
  where: prepared.where
    ? { $and: [baseWhere, prepared.where].filter(Boolean) }
    : baseWhere,
  order: prepared.order,    // ["createdAt:desc", "id:desc"]
  limit: prepared.limit,    // first/last + 1 для hasNext/hasPrev
});

// 3. Формирование Connection
const connection = makeConnection({
  nodes: rows.map(toNode),  // toNode должен реализовать CursorNode
  mapper: (node) => node,
  paging: {
    first: input.first,
    after: input.after,
    last: input.last,
    before: input.before,
    totalCount
  },
  filtersHash: prepared.filtersHash,
  sortParams: prepared.sortParams,
  tieBreaker: 'id',
  invertOrder: prepared.invertOrder,  // для корректного reverse при last
});

return connection;
```

---

## Полный пример использования

На основе Go реализации в `platform/project/service/category/client_get_many.go`:

### 1. Определение CursorNode

```typescript
import type { SeekValue, SortParam } from 'drizzle-gql-toolkit/cursor';
import { buildTieBreakerSeekValue } from 'drizzle-gql-toolkit/cursor';

// Обёртка над entity для реализации CursorNode
class CategoryNode implements CursorNode {
  constructor(
    private entity: CategoryEntity,
    private sortParams: SortParam[]
  ) {}

  getId() { return this.entity.id; }
  getCursorType() { return 'category'; }

  getSeekValues(): SeekValue[] {
    const seekValues: SeekValue[] = [];

    // Формируем seek-значения строго в том же порядке, что и сортировка
    for (const p of this.sortParams) {
      let val: unknown;
      switch (p.field) {
        case 'title':
          val = this.entity.title;
          break;
        case 'createdAt':
          val = this.entity.createdAt;
          break;
        case 'updatedAt':
          val = this.entity.updatedAt;
          break;
        default:
          val = this.entity.updatedAt; // fallback
      }
      seekValues.push({ field: p.field, value: val, order: p.order });
    }

    // Tie-breaker по ID в конце
    seekValues.push(buildTieBreakerSeekValue({
      id: this.entity.id,
      sortParams: this.sortParams,
      tieBreaker: 'id',
    }));

    return seekValues;
  }
}
```

### 2. Резолвер с пагинацией

```typescript
import {
  createQueryBuilder,
  createSchema,
  type NestedWhereInput,
} from 'drizzle-gql-toolkit';
import {
  prepareQuery,
  makeConnection,
  cloneSortParams,
  type PagingInput,
} from 'drizzle-gql-toolkit/cursor';

// Схема
const categorySchema = createSchema({
  table: categories,
  tableName: 'categories',
  fields: {
    id: { column: 'id' },
    title: { column: 'title' },
    status: { column: 'status' },
    createdAt: { column: 'created_at' },
    updatedAt: { column: 'updated_at' },
  },
});

// Резолвер
async function getCategoryConnection(
  db: DrizzleDB,
  input: CategoryConnectionInput
): Promise<CategoryConnection> {
  const qb = createQueryBuilder(categorySchema);

  // 1. Подготовка запроса (пагинация + сортировка + курсор)
  const prepared = prepareQuery({
    first: input.first,
    after: input.after,
    last: input.last,
    before: input.before,
    sort: input.sort,           // "UPDATED_AT_DESC"
    filters: input.filter,      // текущие фильтры для хеша
    defaultField: 'updatedAt',
    tieBreaker: 'id',
  });

  // Если фильтры изменились, курсор был проигнорирован
  // (prepared.filtersChanged === true)

  // 2. Базовый фильтр (не попадает в курсор)
  const baseWhere: NestedWhereInput<typeof categorySchema.__fields> = {
    status: { $eq: 'PUBLISHED' },
  };

  // 3. Объединяем с cursor WHERE
  const where = prepared.where
    ? { $and: [baseWhere, prepared.where] }
    : baseWhere;

  // 4. Выполняем запрос
  const rows = await qb.query(db, {
    where,
    order: prepared.order,      // ["updatedAt:desc", "id:desc"]
    limit: prepared.limit,      // first/last + 1
    select: [...prepared.selection, 'id', 'title', 'status'],
  });

  // 5. Получаем totalCount (с текущими фильтрами)
  const totalCount = await qb.count(db, { where: baseWhere });

  // 6. Оборачиваем в CursorNode
  const sortParamsCopy = cloneSortParams(prepared.sortParams);
  const nodes = rows.map(row => new CategoryNode(row, sortParamsCopy));

  // 7. Собираем Connection
  const connection = makeConnection({
    nodes,
    mapper: (node) => toCategoryGQL(node.entity),
    paging: {
      first: input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      totalCount,
    },
    filtersHash: prepared.filtersHash,
    sortParams: prepared.sortParams,
    tieBreaker: 'id',
    invertOrder: prepared.invertOrder,
  });

  return connection;
}
```

### 3. Маппинг в GraphQL типы

```typescript
function toCategoryConnection(
  conn: Connection<CategoryGQL>
): CategoryConnection {
  return {
    edges: conn.edges.map(edge => ({
      cursor: edge.cursor,
      node: edge.node,
    })),
    pageInfo: {
      hasNextPage: conn.pageInfo.hasNextPage,
      hasPreviousPage: conn.pageInfo.hasPreviousPage,
      startCursor: conn.pageInfo.startCursor,
      endCursor: conn.pageInfo.endCursor,
    },
    totalCount: conn.totalCount,
  };
}
```

---

## Важные детали реализации

### Filters в курсоре — hash-based проверка

Курсор хранит только **хеш** от фильтров (не сами фильтры). Это даёт:
- Маленький размер курсора (16 символов вместо объекта)
- Быстрое сравнение строк O(1)
- Предсказуемый UX: изменил фильтры = начал сначала

```typescript
// В prepareQuery:
export function prepareQuery<F extends FieldsDef>(args: PrepareQueryArgs): PreparedQuery<F> {
  const { after, before, filters } = args;

  // Вычисляем хеш от текущих фильтров
  const currentHash = hashFilters(filters);

  // Декодируем курсор если есть
  let cursor: CursorParams | null = null;
  let filtersChanged = false;

  if (after) {
    cursor = decode(after);
  } else if (before) {
    cursor = decode(before);
  }

  // Проверяем совпадение хеша
  if (cursor && cursor.filtersHash !== currentHash) {
    // Фильтры изменились — игнорируем курсор, начинаем сначала
    cursor = null;
    filtersChanged = true;
  }

  // ... остальная логика

  return {
    // ...
    filtersHash: currentHash,
    filtersChanged,
  };
}
```

### Почему хеш, а не полные фильтры

| Подход | Размер курсора | Сравнение | Безопасность |
|--------|----------------|-----------|--------------|
| Полные фильтры | Большой (JSON объект) | Сложное (deep equal) | Данные видны в base64 |
| Хеш | 16 символов | Быстрое (строки) | Данные не раскрыты |

### totalCount — опциональное поле

`totalCount` считается только если поле запрошено в GraphQL запросе:

```typescript
export type PagingInput = {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  totalCount?: number;  // undefined если не запрошено
};

// В резолвере:
const info = getGraphQLResolveInfo();
const needsTotalCount = fieldRequested(info, 'totalCount');

const totalCount = needsTotalCount
  ? await qb.count(db, { where: countWhere })
  : undefined;

// В makeConnection:
export function makeConnection<T extends CursorNode, K>(
  input: MakeConnectionInput<T, K>
): Connection<K> {
  return {
    edges,
    pageInfo,
    totalCount: input.paging.totalCount,  // undefined если не считали
  };
}
```

### createCursorNode — utility для уменьшения бойлерплейта

Вместо ручной реализации `CursorNode` интерфейса:

```typescript
/**
 * Создаёт CursorNode из row без необходимости писать класс-обёртку
 */
export function createCursorNode<Row>(options: {
  row: Row;
  cursorType: string;
  sortParams: SortParam[];
  tieBreaker: string;
  getId: (row: Row) => string;
  getValue: (row: Row, field: string) => unknown;
}): CursorNode {
  const { row, cursorType, sortParams, tieBreaker, getId, getValue } = options;

  return {
    getId: () => getId(row),
    getCursorType: () => cursorType,
    getSeekValues: () => {
      const seekValues: SeekValue[] = sortParams.map(p => ({
        field: p.field,
        value: getValue(row, p.field),
        order: p.order,
      }));

      // Добавляем tieBreaker
      seekValues.push({
        field: tieBreaker,
        value: getValue(row, tieBreaker),
        order: tieBreakerOrder(sortParams),
      });

      return seekValues;
    },
  };
}

// Использование — одна строка вместо класса:
const nodes = rows.map(row => createCursorNode({
  row,
  cursorType: 'category',
  sortParams: prepared.sortParams,
  tieBreaker: 'id',
  getId: (r) => r.id,
  getValue: (r, field) => r[field as keyof typeof r],
}));
```

### Обработка пустых результатов

Когда `rows.length === 0`:

```typescript
export function makeConnection<T extends CursorNode, K>(
  input: MakeConnectionInput<T, K>
): Connection<K> {
  const { nodes, mapper, paging, invertOrder } = input;

  // Пустой результат
  if (nodes.length === 0) {
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: paging.after != null || paging.before != null,
        startCursor: null,
        endCursor: null,
      },
      totalCount: paging.totalCount,
    };
  }

  // ... остальная логика
}
```

### invertOrder логика для `last` без `before`

Когда запрашивается `last: N` без `before`, нужно:
1. Инвертировать сортировку в SQL запросе
2. Развернуть результат перед возвратом

```typescript
// В prepareQuery:
export function prepareQuery<F extends FieldsDef>(args: PrepareQueryArgs): PreparedQuery<F> {
  const { first, after, last, before } = args;

  // Определяем направление
  const isForward = first != null || after != null;
  const isBackward = last != null || before != null;

  // last без before — особый случай
  const invertOrder = last != null && before == null;

  let order = buildOrderPath(sortParams, tieBreaker);

  if (invertOrder) {
    // Инвертируем сортировку для SQL
    order = order.map(o => {
      const [field, dir] = o.split(':');
      return `${field}:${dir === 'asc' ? 'desc' : 'asc'}`;
    });
  }

  return {
    where: cursorWhere,
    order,
    limit: (first ?? last ?? 20) + 1,  // +1 для определения hasNext/hasPrev
    sortParams,
    filtersHash: currentHash,
    selection,
    isForward,
    invertOrder,  // передаём флаг для makeConnection
    filtersChanged,
  };
}

// В makeConnection:
export function makeConnection<T extends CursorNode, K>(
  input: MakeConnectionInput<T, K>
): Connection<K> {
  let { nodes } = input;
  const { invertOrder, paging } = input;
  const limit = paging.first ?? paging.last ?? 20;

  // Проверяем есть ли ещё страницы
  const hasMore = nodes.length > limit;
  if (hasMore) {
    nodes = nodes.slice(0, limit);  // Убираем лишний элемент
  }

  // Если order был инвертирован — разворачиваем результат
  if (invertOrder) {
    nodes = [...nodes].reverse();
  }

  // Определяем hasNextPage / hasPreviousPage
  const hasNextPage = paging.first != null
    ? hasMore
    : paging.before != null;  // backward пагинация

  const hasPreviousPage = paging.last != null
    ? (invertOrder ? hasMore : paging.after != null)
    : paging.after != null;

  // Формируем edges
  const edges = nodes.map(node => ({
    cursor: encode({
      type: node.getCursorType(),
      filtersHash: input.filtersHash,
      seek: node.getSeekValues(),
    }),
    node: input.mapper(node),
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: paging.totalCount,
  };
}
```

### Пример: forward vs backward vs last-without-before

```typescript
// Данные: [A, B, C, D, E] отсортированы по updatedAt DESC

// 1. first: 2 → SQL: ORDER BY updatedAt DESC LIMIT 3
//    Результат: [A, B, C] → hasMore=true → return [A, B], hasNextPage=true

// 2. first: 2, after: B → SQL: WHERE updatedAt < B.updatedAt ORDER BY updatedAt DESC LIMIT 3
//    Результат: [C, D, E] → hasMore=true → return [C, D], hasNextPage=true, hasPreviousPage=true

// 3. last: 2, before: D → SQL: WHERE updatedAt > D.updatedAt ORDER BY updatedAt ASC LIMIT 3
//    Результат: [C, B, A] → hasMore=true → reverse → [A, B, C] → return [B, C], hasPreviousPage=true

// 4. last: 2 (без before) — хотим последние 2 элемента
//    invertOrder=true
//    SQL: ORDER BY updatedAt ASC LIMIT 3  (инвертировали!)
//    Результат: [E, D, C] → hasMore=true → slice → [E, D] → reverse → [D, E]
//    return [D, E], hasPreviousPage=true, hasNextPage=false
```

---

## Порядок реализации

1. `cursor.ts` — типы (CursorParams с filtersHash), encode/decode, validateCursorParams
2. `helpers.ts` — SortParam, snakeToCamel, tieBreakerOrder, **hashFilters**
3. `sort.ts` — parseSort, validateCursorOrder
4. `where.ts` — buildCursorWhereInput (лексикографическая лестница)
5. `connection.ts` — makeConnection
6. `query.ts` — prepareQuery (с проверкой filtersHash)
7. `config.ts` — createCursorConfig (фабрика с типами из схемы)
8. `index.ts` + экспорт из главного index.ts
9. Тесты (особенно для hashFilters и filtersChanged)

---

## Примечания

- `batch_helpers.go` (GroupByUUID, BuildBatchedConnections) — опционально для DataLoader
- Существующий `pagination.ts` останется для offset-пагинации
- `order` формат: `["field:asc", "field:desc"]` — совместим с существующим `OrderPath`
- `where` формат: `NestedWhereInput<F>` — совместим с `TypedInput.where`
- `sort` вход поддерживает оба формата: `"UPDATED_AT_DESC"` (GraphQL enum) и `"updatedAt:desc"`

## Ключевые отличия от Go

| Аспект | Go | TypeScript |
|--------|-----|------------|
| Order тип | `"ASC"` / `"DESC"` | `"asc"` / `"desc"` (OrderDirection) |
| Order формат | `[]string{"fieldDESC"}` | `["field:desc"]` (OrderPath) |
| Where формат | `goqutil.WhereInputV2` | `NestedWhereInput<F>` |
| Generics | `[T ~string]` | `<T extends string>` |
| Base64 | `base64.RawURLEncoding` | base64url (без padding) |
| Filters в курсоре | Полный объект `map[string]interface{}` | Только хеш (16 символов) |
| При изменении фильтров | Используются фильтры из курсора | Курсор игнорируется, начало с 1 страницы |
