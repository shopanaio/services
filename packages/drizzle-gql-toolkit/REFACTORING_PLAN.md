# План рефакторинга drizzle-gql-toolkit

## Текущее состояние типов

**Уже есть строгая типизация:**
- `NestedWhereInput<Fields>` — строго типизированный where (types.ts:381-390)
- `TypedInput<Fields>` — использует `NestedWhereInput` (builder.ts:115-126)
- `buildSelectSql()`, `fromInput()`, `query()` — используют `TypedInput`

**Проблема:** internal методы используют слабый `WhereInputV3`:
- `where()` (builder.ts:230) — принимает `WhereInputV3`
- `buildWhereConditions()` (builder.ts:255) — внутренний метод
- Это legacy от goqutil совместимости

## Breaking Changes (что сломается)

### API изменения
1. `QueryBuilder` станет immutable — методы будут возвращать контекст
2. `where()` будет возвращать `{ sql: SQL | undefined; joins: JoinInfo[] }` вместо просто `SQL`
3. Удаление deprecated типов: `WhereInput<T>`, `Input<T>`, `InputG<T>`, `WhereInputV3`
4. `query()` метод будет требовать типизированный `db` вместо `{ execute: ... }`

### Типы
1. `WhereInputV3` удаляется — внутренние методы переходят на `NestedWhereInput<Fields>`
2. Убираем `[key: string]: unknown` паттерны

---

## Фаза 1: Архитектурный рефакторинг

### 1.1 Декомпозиция QueryBuilder

**Файл: `builder.ts` → разбить на:**

```
src/
├── builder/
│   ├── index.ts           # Re-exports
│   ├── query-builder.ts   # Основной класс (фасад)
│   ├── where-builder.ts   # Построение WHERE
│   ├── join-collector.ts  # Сбор JOIN'ов
│   ├── order-builder.ts   # Построение ORDER BY
│   └── sql-renderer.ts    # Рендеринг SQL
```

**Задачи:**
- [ ] Создать `WhereBuilder` — изолированная логика фильтров
- [ ] Создать `JoinCollector` — сбор и дедупликация JOIN'ов
- [ ] Создать `OrderBuilder` — построение ORDER BY с nested paths
- [ ] Создать `SqlRenderer` — рендеринг финального SQL
- [ ] `QueryBuilder` становится фасадом, координирующим компоненты

### 1.2 Immutable State

**Текущая проблема:**
```ts
// builder.ts:185-186 — мутабельное состояние
private joins: Map<string, JoinInfo> = new Map();
private aliasedTables: Map<string, AliasedTable> = new Map();
```

**Решение:**
```ts
// Новый подход — возврат результата с состоянием
interface QueryContext {
  joins: Map<string, JoinInfo>;
  aliasedTables: Map<string, AliasedTable>;
}

where(input: WhereInput, ctx?: QueryContext): WhereResult {
  const context = ctx ?? createContext();
  // ... логика
  return { sql, context };
}
```

### 1.3 Устранение дублирования

**Проблема:** `query()` и `buildSelectSql()` дублируют ~70 строк

**Решение:**
```ts
private buildRawQuery(input: TypedInput<Fields>): {
  sql: SQL;
  context: QueryContext;
} {
  // Общая логика
}

buildSelectSql(input): SQL {
  return this.buildRawQuery(input).sql;
}

async query(db, input): Promise<T[]> {
  const { sql } = this.buildRawQuery(input);
  return db.execute(sql);
}
```

---

## Фаза 2: Type Safety

### 2.1 Удалить WhereInputV3, использовать NestedWhereInput

**Текущее состояние:**
- `NestedWhereInput<Fields>` уже существует и строго типизирован (types.ts:381-390)
- `TypedInput<Fields>.where` уже использует `NestedWhereInput<Fields>`
- `WhereInputV3` — legacy тип с `[key: string]: unknown`

**Задачи:**
1. Удалить `WhereInputV3` из types.ts и index.ts
2. Изменить сигнатуру `where()` метода:
   ```ts
   // Было
   where(input: WhereInputV3 | undefined | null): SQL | undefined

   // Станет (generic для типизации)
   where(input: NestedWhereInput<Fields> | undefined | null): SQL | undefined
   ```
3. Обновить internal методы `buildWhereConditions()` для работы с `NestedWhereInput`
4. Удалить deprecated типы: `WhereInput<T>`, `Input<T>`, `InputG<T>`, `SchemaWhereInput<F>`

### 2.2 Типизация db executor

**Создать интерфейс:**
```ts
// types.ts
export interface DrizzleExecutor<T extends Table = Table> {
  execute<R = T["$inferSelect"]>(query: SQL): Promise<R[]>;
}

// Или использовать тип из drizzle
import type { PgDatabase } from "drizzle-orm/pg-core";
```

### 2.3 Убрать `as unknown as` кастинг

**Проблема (builder.ts:221-224):**
```ts
return sql`...` as unknown as Column;  // Опасно!
```

**Решение:**
```ts
// Создать отдельный тип для SQL column reference
type ColumnRef = SQL | Column;

private getAliasedColumn(aliased: AliasedTable, columnName: string): ColumnRef {
  // Явное разделение случаев
}
```

### 2.4 Типизация операторов

**Добавить в operators.ts:**
```ts
type OperatorHandler<T = unknown> = (column: Column, value: T) => SQL | null;

const OPERATOR_HANDLERS: Record<string, OperatorHandler> = {
  eq: (col, val) => eq(col, val),
  // ...
};
```

---

## Фаза 3: Reliability

### 3.1 Защита от глубокой рекурсии

**Добавить в QueryBuilderConfig:**
```ts
export type QueryBuilderConfig = {
  maxLimit?: number;
  defaultLimit?: number;
  maxJoinDepth?: number;  // NEW: default 5
};
```

**Реализация:**
```ts
private buildNestedJoinConditions<F extends FieldsDef>(
  fieldConfig: FieldConfig,
  parentSchema: ObjectSchema,
  depth: number,
  nestedInput: NestedWhereInput<F>
): SQL[] {
  if (depth >= this.config.maxJoinDepth) {
    throw new QueryBuilderError(
      `Maximum join depth (${this.config.maxJoinDepth}) exceeded`
    );
  }
  // ...
}
```

### 3.2 Custom Error Classes

**Создать errors.ts:**
```ts
export class QueryBuilderError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'QueryBuilderError';
  }
}

export class InvalidFilterError extends QueryBuilderError {
  constructor(field: string, reason: string) {
    super(`Invalid filter for "${field}": ${reason}`, 'INVALID_FILTER');
  }
}

export class JoinDepthExceededError extends QueryBuilderError {
  constructor(depth: number, max: number) {
    super(`Join depth ${depth} exceeds maximum ${max}`, 'JOIN_DEPTH_EXCEEDED');
  }
}
```

### 3.3 Валидация входных данных

**Добавить в operators.ts:**
```ts
export function validateFilterValue(
  operator: string,
  value: unknown
): { valid: boolean; reason?: string } {
  switch (operator) {
    case '$like':
    case '$iLike':
      if (typeof value !== 'string') {
        return { valid: false, reason: 'Expected string' };
      }
      if (value.length > 1000) {
        return { valid: false, reason: 'Pattern too long' };
      }
      return { valid: true };
    // ...
  }
}
```

### 3.4 Graceful handling пустых массивов

**Текущее поведение (operators.ts:91-94):**
```ts
case "in":
  if (Array.isArray(value) && value.length > 0) {
    return inArray(column, value);
  }
  return null;  // Молча игнорирует!
```

**Улучшение:**
```ts
case "in":
  if (!Array.isArray(value)) {
    throw new InvalidFilterError(columnName, '$in requires array');
  }
  if (value.length === 0) {
    // Пустой IN = всегда false
    return sql`FALSE`;
  }
  return inArray(column, value);
```

---

## Фаза 4: Performance

### 4.1 Кеширование схем

**Добавить в schema.ts:**
```ts
const schemaCache = new WeakMap<Table, ObjectSchema>();

export function createSchema<T extends Table, Config>(
  config: SchemaConfig<T, Config>
): ObjectSchema<T, keyof Config & string, InferFieldsDef<Config>> {
  const cached = schemaCache.get(config.table);
  if (cached) return cached as any;

  const schema = new ObjectSchema(config);
  schemaCache.set(config.table, schema);
  return schema;
}
```

### 4.2 Prepared field paths

**Оптимизация для частых путей:**
```ts
class ObjectSchema {
  private pathCache = new Map<string, FieldConfig[]>();

  resolvePath(path: string): FieldConfig[] {
    if (this.pathCache.has(path)) {
      return this.pathCache.get(path)!;
    }
    const resolved = this.doResolvePath(path);
    this.pathCache.set(path, resolved);
    return resolved;
  }
}
```

### 4.3 SQL template caching

**Для повторяющихся паттернов:**
```ts
const JOIN_SQL_CACHE = new Map<string, SQL>();

function buildJoinSql(
  joinType: JoinType,
  targetAliased: AliasedTable,
  onCondition: SQL
): SQL {
  const cacheKey = `${joinType}:${targetAliased[Table.Symbol.Name]}`;
  // ...
}
```

---

## Фаза 5: API Improvements

### 5.1 Fluent Builder API (опционально)

```ts
const result = qb
  .where({ status: 'active' })
  .orderBy(['createdAt:desc'])
  .limit(20)
  .offset(0)
  .build();
```

### 5.2 Унификация возвращаемых типов

```ts
interface QueryResult<T> {
  sql: SQL;
  joins: JoinInfo[];
  params: Record<string, unknown>;
}

// Все методы возвращают консистентные типы
where(input): WhereResult  // { sql?: SQL, joins: JoinInfo[] }
orderBy(input): OrderResult  // { sql?: SQL }
select(fields): SelectResult  // { columns: Record<string, Column> }
```

### 5.3 Debug mode

```ts
export type QueryBuilderConfig = {
  // ...existing
  debug?: boolean;
  logger?: (message: string, data?: unknown) => void;
};

// Usage
const qb = createQueryBuilder(schema, {
  debug: true,
  logger: console.log
});
```

---

## Фаза 6: Testing & Documentation

### 6.1 Расширение тестов

- [ ] Unit тесты для каждого нового модуля
- [ ] Integration тесты с реальной БД (PostgreSQL, MySQL, SQLite)
- [ ] Property-based тесты для edge cases

### 6.2 Документация

- [ ] JSDoc для всех публичных API
- [ ] README с примерами миграции
- [ ] CHANGELOG с breaking changes

---

## Порядок выполнения

### Sprint 1: Foundation (Critical)
1. Декомпозиция QueryBuilder (1.1)
2. Immutable state (1.2)
3. Custom errors (3.2)
4. Защита от рекурсии (3.1)

### Sprint 2: Type Safety
1. Удалить WhereInputV3 и deprecated типы (2.1)
2. Типизация executor (2.2)
3. Убрать unsafe casting (2.3)

### Sprint 3: Reliability
1. Валидация входных данных (3.3)
2. Graceful empty arrays (3.4)
3. Устранение дублирования (1.3)

### Sprint 4: Performance
1. Кеширование схем (4.1)
2. Path caching (4.2)

### Sprint 5: Polish
1. API improvements (5.1-5.3)
2. Testing (6.1)
3. Documentation (6.2)

---

## Оценка трудозатрат

| Фаза | Сложность | Приоритет | Примечание |
|------|-----------|-----------|------------|
| 1. Архитектура | High | Critical | Декомпозиция + immutable |
| 2. Type Safety | Low | High | Удаление legacy типов (NestedWhereInput уже есть) |
| 3. Reliability | Medium | High | Валидация, errors |
| 4. Performance | Low | Medium | Кеширование |
| 5. API | Low | Low | Fluent API, debug |
| 6. Testing | Medium | High | Integration tests |

**Примечание:** Multi-dialect поддержка не нужна — Drizzle ORM уже абстрагирует различия SQL диалектов (`ilike`, `sql.identifier` и др.)

---

## Риски

1. **Breaking changes** — потребуется миграция существующего кода
2. **Performance regression** — декомпозиция может замедлить hot paths
