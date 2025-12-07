# План рефакторинга: замена raw SQL на Drizzle ORM builder

## Текущее состояние

Сейчас используется `sql``\` template literal для:
1. Алиасов таблиц: `sql.identifier("t0_products")`
2. Операторов: `sql\`${aliasedColumn} = ${value}\``
3. JOIN условий: `sql.raw("LEFT JOIN") ... ON ...`
4. ORDER BY: `sql\`${identifier} DESC\``

## Цель

Заменить raw SQL на встроенные функции Drizzle ORM:
- `aliasedTable(table, alias)` для алиасов
- `eq()`, `ne()`, `like()`, `ilike()` и др. для операторов
- `.leftJoin()`, `.rightJoin()` и др. для джоинов
- `asc()`, `desc()` для сортировки

## Ключевые изменения

### 1. Создание алиасов таблиц

**Было:**
```typescript
const tableAlias = `t${depth}_${tableName}`;
sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`
```

**Станет:**
```typescript
import { aliasedTable } from "drizzle-orm";

const aliased = aliasedTable(table, `t${depth}_${tableName}`);
// Колонки доступны как aliased.columnName
```

### 2. Операторы с алиасами (operators.ts)

**Было:**
```typescript
const aliasedColumn = sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`;
return sql`${aliasedColumn} = ${value}`;
```

**Станет:**
```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, inArray, isNull } from "drizzle-orm";

// Получаем колонку из алиасированной таблицы
const column = aliasedTable[columnName];
return eq(column, value);
```

### 3. Хранение алиасов таблиц

Новая структура для отслеживания алиасов:

```typescript
type AliasedTableInfo = {
  alias: string;
  table: ReturnType<typeof aliasedTable>;
  depth: number;
};

// Map: alias -> AliasedTableInfo
private aliasedTables: Map<string, AliasedTableInfo> = new Map();
```

### 4. Регистрация JOIN (builder.ts)

**Было:**
```typescript
private registerJoin(
  sourceAlias: string,
  targetTable: Table,
  targetAlias: string,
  ...
): void {
  this.joins.set(targetAlias, { ... });
}
```

**Станет:**
```typescript
private registerJoin(
  sourceAliased: AliasedTable,
  targetTable: Table,
  targetAlias: string,
  ...
): void {
  const targetAliased = aliasedTable(targetTable, targetAlias);
  this.aliasedTables.set(targetAlias, {
    alias: targetAlias,
    table: targetAliased,
    depth,
  });
  this.joins.set(targetAlias, {
    type,
    sourceTable: sourceAliased,
    targetTable: targetAliased,
    conditions: [...],
  });
}
```

### 5. Построение WHERE условий

**Было:**
```typescript
const aliasedColumn = sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`;
conditions.push(sql`${aliasedColumn} = ${value}`);
```

**Станет:**
```typescript
const aliasedTable = this.getAliasedTable(tableAlias);
const column = aliasedTable[columnName];
conditions.push(eq(column, value));
```

### 6. Построение SELECT

**Было:**
```typescript
sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)}`
```

**Станет:**
```typescript
const aliasedTable = this.getAliasedTable(tableAlias);
aliasedTable[columnName]
```

### 7. Построение ORDER BY

**Было:**
```typescript
const dirSql = direction === "desc" ? sql`DESC` : sql`ASC`;
return sql`${sql.identifier(tableAlias)}.${sql.identifier(columnName)} ${dirSql}`;
```

**Станет:**
```typescript
import { asc, desc } from "drizzle-orm";

const aliasedTable = this.getAliasedTable(tableAlias);
const column = aliasedTable[columnName];
return direction === "desc" ? desc(column) : asc(column);
```

### 8. Применение JOIN к запросу

**Было:**
```typescript
const joinSql = buildJoinSql(join.type, join.targetTable, join.targetAlias, onCondition);
// Собираем в raw SQL строку
```

**Станет:**
```typescript
for (const join of this.joins.values()) {
  const onCondition = eq(join.sourceTable[sourceCol], join.targetTable[targetCol]);

  switch (join.type) {
    case "left":
      query = query.leftJoin(join.targetTable, onCondition);
      break;
    case "right":
      query = query.rightJoin(join.targetTable, onCondition);
      break;
    case "inner":
      query = query.innerJoin(join.targetTable, onCondition);
      break;
    case "full":
      query = query.fullJoin(join.targetTable, onCondition);
      break;
  }
}
```

## Порядок реализации

### Фаза 1: Подготовка инфраструктуры
1. [ ] Добавить типы для `AliasedTable`
2. [ ] Создать Map для хранения алиасированных таблиц
3. [ ] Добавить метод `getOrCreateAliasedTable(table, depth)`

### Фаза 2: Рефакторинг operators.ts
4. [ ] Изменить `buildOperatorConditionWithAlias` для работы с `AliasedTable` вместо string alias
5. [ ] Удалить дублирование кода между `buildOperatorCondition` и `buildOperatorConditionWithAlias`

### Фаза 3: Рефакторинг builder.ts - WHERE
6. [ ] Изменить `buildFieldConditionsWithAlias` для работы с aliased columns
7. [ ] Обновить `buildWhereConditions` для передачи aliased table

### Фаза 4: Рефакторинг builder.ts - JOIN
8. [ ] Изменить `registerJoin` для создания aliased tables
9. [ ] Изменить `JoinInfo` тип для хранения aliased tables
10. [ ] Обновить `buildJoinsSql` для использования `.leftJoin()` и др.

### Фаза 5: Рефакторинг builder.ts - SELECT/ORDER
11. [ ] Изменить `resolveSelectField` для работы с aliased columns
12. [ ] Изменить `resolveOrderField` для работы с aliased columns
13. [ ] Обновить `buildOrderBySqlWithJoins`

### Фаза 6: Интеграция
14. [ ] Обновить `buildSelectSql` для использования query builder
15. [ ] Обновить `query()` метод
16. [ ] Обновить `applyJoins` helper

### Фаза 7: Тестирование
17. [ ] Прогнать существующие snapshot тесты
18. [ ] Исправить различия в SQL (если есть)
19. [ ] Добавить новые тесты для edge cases

## Потенциальные проблемы

1. **Динамический доступ к колонкам**: `aliasedTable[columnName]` требует правильной типизации
   - Решение: использовать `getTableColumns(aliasedTable)` для получения всех колонок
   - Или прямой доступ: `(aliasedTable as any)[columnName]`
2. **Composite ключи**: Нужно убедиться что `and()` работает с multiple ON conditions
3. **NULLS FIRST/LAST**: Drizzle `asc()`/`desc()` не поддерживают напрямую - оставить `sql` для этого
4. **Производительность**: Создание aliasedTable на каждый запрос (minimal overhead)

## Доступ к колонкам aliased table

```typescript
import { aliasedTable, getTableColumns } from "drizzle-orm";

const t0_products = aliasedTable(products, "t0_products");

// Способ 1: Прямой доступ (типизированный)
const column = t0_products.id;  // работает для известных колонок

// Способ 2: Через getTableColumns
const columns = getTableColumns(t0_products);
const column = columns["id"];  // для динамического доступа

// Способ 3: Type assertion для динамики
const column = (t0_products as Record<string, Column>)[columnName];
```

## Альтернативный подход (если aliasedTable не подходит)

Если `aliasedTable` не даёт достаточной гибкости, можно:
1. Создать helper функции для построения SQL фрагментов
2. Использовать `sql.raw()` только там где необходимо
3. Максимально использовать встроенные операторы для WHERE условий

## Необходимые импорты

```typescript
import {
  and,
  or,
  asc,
  desc,
  sql,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  notLike,
  notIlike,
  inArray,
  notInArray,
  isNull,
  isNotNull,
  aliasedTable,
  getTableColumns,
  type SQL,
  type Table,
  type Column,
} from "drizzle-orm";
```

## Ссылки

- [Drizzle ORM Joins](https://orm.drizzle.team/docs/joins)
- [Drizzle ORM Operators](https://orm.drizzle.team/docs/operators)
- [Dynamic Table Aliasing](https://stackoverflow.com/questions/78578101/drizzle-dynamic-query-table-aliasing)
