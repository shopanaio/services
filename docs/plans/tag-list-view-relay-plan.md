# План: `tag_list_view` и Relay-интеграция списка тегов

## Цель

Сделать backend списка тегов таким же по принципу работы, как список продуктов:

- список должен читаться через PostgreSQL VIEW, а не напрямую из таблицы `tag`;
- `@shopana/drizzle-query` Relay pagination должен строиться поверх view;
- фильтрация, сортировка, пагинация и `totalCount` должны использовать один и тот же scoped query;
- локаль должна учитываться на уровне list view так же, как у `product_list_view`;
- GraphQL API должен получить `where` и `orderBy` для `catalogQuery.tags`.

## Текущее состояние

Сейчас теги уже имеют таблицу переводов:

- `tag` хранит `projectId`, `id`, `handle`, `createdAt`;
- `tag_translation` хранит `projectId`, `tagId`, `locale`, `name`;
- primary key у перевода: `[tagId, locale]`.
- у категорий `productsCount` уже реализован как денормализованное поле `products_count` в основной таблице `category`; для тегов нужно повторить этот подход, а не считать количество продуктов внутри list view.

Но список тегов работает проще, чем список продуктов:

- `tagRelayQuery` построен напрямую на `tag`;
- `TagRepository.getConnection()` добавляет только `projectId`;
- `totalCount` считается через `this.count()`, поэтому не учитывает `where` из Relay query;
- `Tag.name` резолвится отдельно через DataLoader по текущей локали;
- `catalogQuery.tags` не принимает `where` и `orderBy`;
- Admin UI фильтрует search локально по текущей странице, а не через API.

Для сравнения, продукты используют `product_list_view`, где уже соединены продукт, перевод, цена, primary category и бренд. `ProductRepository.getConnection()` строит `mergedWhere` с `projectId`, `deletedAt`, `locale`, `currency`, пользовательским `where` и дополнительным scope, а затем вызывает:

```ts
productRelayQuery.execute(this.connection, executeInput)
productRelayQuery.count(this.connection, { where: mergedWhere })
```

Список тегов должен повторить этот подход.

## Целевая модель

Добавить Drizzle view `tagListView`:

```ts
export const tagListView = catalogSchema.view("tag_list_view").as((qb) =>
  qb
    .select({
      projectId: tag.projectId,
      id: tag.id,
      handle: tag.handle,
      createdAt: tag.createdAt,
      productsCount: tag.productsCount,
      locale: tagTranslation.locale,
      name: tagTranslation.name,
    })
    .from(tag)
    .innerJoin(
      tagTranslation,
      sql`${tagTranslation.projectId} = ${tag.projectId} AND ${tagTranslation.tagId} = ${tag.id}`
    )
);
```

`innerJoin` с переводами намеренно повторяет поведение `product_list_view`: строка list view существует для конкретной локали. Чтобы теги не пропадали из списка, create/backfill должны гарантировать перевод хотя бы в дефолтной локали.

`productsCount` должен приходить из `tag.productsCount`, то есть из денормализованного поля основной таблицы. View не должен делать `leftJoin product_tag`, `count(...)` или `groupBy` ради счетчика.

## Фаза 1. Drizzle model и миграция

Добавить в таблицу `tag` поле по аналогии с `category.productsCount`:

```ts
productsCount: integer("products_count").notNull().default(0),
```

Создать файл:

```text
services/catalog/src/repositories/models/tagListView.ts
```

Экспортировать `tagListView` из:

```text
services/catalog/src/repositories/models/index.ts
```

Сгенерировать миграцию Drizzle для `CREATE VIEW catalog.tag_list_view AS ...`.

Важные детали:

- view не должна фильтровать `projectId` или `locale` внутри SQL; это делает repository scope;
- `productsCount` должен быть обычной колонкой `tag.products_count`, как у категорий;
- view не должна читать `product_tag` для счетчика;
- не добавлять fallback `name = handle` внутри view, если цель - полная аналогия с products list view;
- если нужен UX fallback, он должен быть обеспечен данными: перевод создается автоматически.

Для существующих данных нужна backfill-миграция счетчика:

```sql
update catalog.tag t
set products_count = counts.products_count
from (
  select pt.tag_id, count(pt.product_id)::int as products_count
  from catalog.product_tag pt
  group by pt.tag_id
) counts
where counts.tag_id = t.id;
```

Теги без строк в `product_tag` останутся с default `0`.

## Фаза 2. Data hygiene для переводов

Сейчас `TagCreateInput.name` описан как optional with default to handle, но `TagCreateScript` создает перевод только если `name` передан. Для view-подхода это риск: тег без перевода в текущей локали исчезнет из списка.

Нужно изменить create-логику:

```ts
await this.repository.tag.upsertTranslation({
  projectId: this.getProjectId(),
  tagId: tag.id,
  locale: this.getLocale(),
  name: name ?? handle,
});
```

Для существующих данных нужна миграция/backfill:

```sql
insert into catalog.tag_translation (project_id, tag_id, locale, name)
select t.project_id, t.id, s.default_locale, t.handle
from catalog.tag t
join project.store s on s.id = t.project_id
where not exists (
  select 1
  from catalog.tag_translation tt
  where tt.tag_id = t.id
    and tt.locale = s.default_locale
);
```

Backfill должен использовать проектную настройку default locale; если она недоступна в миграции, миграцию нужно разделить или передать locale явно, а не использовать backend fallback.

## Фаза 3. Поддержка денормализованного `productsCount`

Нужно поддерживать `tag.productsCount` при изменении связей `product_tag`, аналогично категории:

- при добавлении связи product -> tag инкрементировать `tag.products_count`;
- при удалении связи product -> tag декрементировать `tag.products_count`;
- не допускать отрицательных значений;
- учитывать `onConflictDoNothing()` в `linkProductToTag`: счетчик нужно увеличивать только если связь реально создана;
- учитывать результат `delete` в `unlinkProductFromTag`: счетчик нужно уменьшать только если связь реально удалена.

Практически это можно сделать методами repository:

```ts
async incrementProductsCount(tagId: string): Promise<void> { ... }
async decrementProductsCount(tagId: string): Promise<void> { ... }
```

И вызывать их из `linkProductToTag` / `unlinkProductFromTag` в той же транзакции. Если в проекте уже есть общий механизм пересчета/ребаланса category counts, для тегов нужен такой же maintenance/backfill сценарий.

## Фаза 4. Repository: Relay query поверх view

Обновить `TagRepository.ts`:

```ts
import { tagListView } from "../models/index.js";
```

Заменить `tagRelayQuery`:

```ts
export const tagRelayQuery = createRelayQuery(
  createQuery(tagListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeTagGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "tag", tieBreaker: "id" }
);
```

Если `decodeTagGlobalId` еще нет в `global-id-where-mappers.ts`, добавить его по аналогии с `decodeProductGlobalId`, `decodeCategoryGlobalId`, `decodeVendorGlobalId`.

Обновить `getConnection()`:

```ts
async getConnection(args: TagRelayInput): Promise<TagConnectionResult> {
  const { where, orderBy, ...paginationArgs } = args;

  const mergedWhere: TagRelayInput["where"] = {
    _and: [
      { projectId: { _eq: this.storeId } },
      { locale: { _eq: this.locale } },
      ...(where ? [where] : []),
    ],
  };

  const executeInput: TagRelayInput = {
    ...paginationArgs,
    where: mergedWhere,
    orderBy: orderBy ?? [
      { field: "createdAt", direction: "desc" },
      { field: "id", direction: "desc" },
    ],
  };

  const [result, totalCount] = await Promise.all([
    tagRelayQuery.execute(this.connection, executeInput),
    tagRelayQuery.count(this.connection, { where: mergedWhere }),
  ]);

  return {
    edges: result.edges.map((edge) => ({
      cursor: edge.cursor,
      nodeId: edge.node.id,
    })),
    pageInfo: result.pageInfo,
    totalCount,
  };
}
```

Ключевой момент: `totalCount` должен считаться через `tagRelayQuery.count` по `mergedWhere`, а не через старый `this.count()`. Иначе при `where`/search счетчик будет показывать общее число тегов, а не размер текущей выборки.

## Фаза 5. GraphQL schema для фильтрации и сортировки

Расширить `catalogQuery.tags` в:

```text
services/catalog/src/api/graphql-admin/schema/base.graphql
```

Целевой контракт:

```graphql
tags(
  first: Int
  after: String
  last: Int
  before: String
  """
  Filter conditions
  """
  where: TagWhereInput
  """
  Sort order
  """
  orderBy: [TagOrderByInput!]
): TagConnection!
```

После добавления `tagListView` и обновления `tagRelayQuery` generated filters должны получить поля view:

- `id`;
- `projectId`;
- `handle`;
- `createdAt`;
- `locale`;
- `name`;
- `productsCount`.

Для public GraphQL не нужно раскрывать `projectId` и `locale` как поля `Tag`; они нужны только в generated input types для repository scope.

## Фаза 6. Resolver layer

`TagConnectionResolver` может остаться почти без изменений, потому что он уже вызывает:

```ts
repository.tag.getConnection(this.$props)
```

Но типы должны быть синхронизированы:

```ts
export type TagConnectionInput = TagRelayInput;

export class TagConnectionResolver extends BaseConnectionResolver<TagConnectionInput> {
  ...
}
```

`QueryResolver.tags(args: TagConnectionInput)` тоже может остаться прежним после генерации типов, если generated resolver args совместимы с `TagRelayInput`.

## Фаза 7. Resolver данных `Tag`

Есть два варианта.

Рекомендуемый первый шаг: оставить текущий `TagResolver.name()` и `TagResolver.productsCount()` через DataLoader. Тогда connection возвращает только `nodeId`, а поля node резолвятся существующим способом. Это минимальный риск и повторяет текущий BaseConnectionResolver pattern.

Оптимизация вторым шагом: передавать list row snapshot из `tag_list_view` в `TagResolver`, чтобы `name` и `productsCount` не перечитывались отдельными DataLoader-ами для списка. Это требует расширить connection data shape и аккуратно не сломать node resolver для `tag(id:)`. Для первого backend parity с products list view это не обязательно.

## Фаза 8. Generated artifacts

После изменений схемы и Drizzle models нужно обновить generated артефакты через проектный pipeline:

- Drizzle migration для view;
- GraphQL generated schema/filter inputs;
- TypeScript generated resolver types;
- Admin GraphQL generated types, если frontend сразу начнет использовать `TagWhereInput`/`TagOrderByInput`.

По правилам проекта development-команды должны выполняться через `shopana-cli` MCP tools. `test` и `tsc` не запускать; если нужна проверка новой версии кода, запускать build.

## Фаза 9. Admin UI follow-up

Backend change сам по себе не включит server-side search в UI. Нужно обновить frontend, чтобы список тегов начал передавать `where` и `orderBy`.

Изменить:

```text
admin/src/domains/inventory/tags/graphql/queries.ts
admin/src/domains/inventory/tags/graphql/operation-types.ts
admin/src/domains/inventory/tags/hooks/use-tags.ts
admin/src/domains/inventory/tags/page/page-config.ts
admin/src/domains/inventory/tags/page/filter-schema.ts
admin/src/domains/inventory/tags/page/page.tsx
```

Целевое поведение:

- search по `name` и `handle` уходит в `where`, а не применяется к текущей странице;
- сортировка колонок `name`, `handle`, `productsCount`, `createdAt` уходит в `orderBy`;
- при изменении `where` или `orderBy` cursor pagination сбрасывается на первую страницу;
- `totalCount` отображает размер отфильтрованной выборки.

Пример переменных:

```graphql
query Tags(
  $first: Int
  $after: String
  $last: Int
  $before: String
  $where: TagWhereInput
  $orderBy: [TagOrderByInput!]
) {
  catalogQuery {
    tags(
      first: $first
      after: $after
      last: $last
      before: $before
      where: $where
      orderBy: $orderBy
    ) {
      edges {
        cursor
        node {
          ...TagListFields
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
}
```

## Acceptance criteria

- В базе есть `catalog.tag_list_view`.
- `tag_list_view` возвращает одну строку на пару `tag + locale`.
- `TagRepository.tagRelayQuery` построен поверх `tagListView`, а не `tag`.
- `TagRepository.getConnection()` всегда добавляет `projectId` и текущую `locale`.
- `TagRepository.getConnection()` считает `totalCount` через `tagRelayQuery.count(..., { where: mergedWhere })`.
- `catalogQuery.tags` принимает `where` и `orderBy`.
- Поиск/фильтрация по `name` и `handle` работает на backend.
- Сортировка по `name`, `handle`, `createdAt`, `productsCount` работает через Relay query.
- `productsCount` хранится в `tag.products_count` как денормализованное поле, а не считается в `tag_list_view`.
- Теги без продуктов показывают `productsCount = 0`.
- Добавление/удаление связи product -> tag корректно обновляет `tag.products_count`.
- Теги с переводом в другой локали не попадают в список текущей локали.
- Новые теги всегда получают перевод текущей локали: `name ?? handle`.
- Старые теги без дефолтного перевода получают backfill.

## Риски и решения

| Риск | Решение |
| --- | --- |
| Теги без `tag_translation` пропадут из списка | Исправить `TagCreateScript` и добавить backfill миграцию |
| `totalCount` будет неверным при search | Считать через `tagRelayQuery.count` по тому же `mergedWhere` |
| Денормализованный `productsCount` может рассинхронизироваться | Обновлять счетчик в тех же транзакциях, где меняется `product_tag`, и добавить backfill/recount миграцию |
| Фильтр по global ID не совпадет с DB uuid | Добавить `decodeTagGlobalId` в `mapWhereFields` |
| UI продолжит локально фильтровать только текущую страницу | Отдельным frontend follow-up передавать `where`/`orderBy` в `TAGS_QUERY` |

## Рекомендуемый порядок работ

1. Добавить `tag.productsCount` в Drizzle model.
2. Добавить `tagListView` model и export.
3. Добавить/сгенерировать Drizzle migration с колонкой `products_count`, backfill счетчика, backfill переводов и view.
4. Исправить `TagCreateScript`, чтобы перевод создавался всегда.
5. Добавить транзакционную поддержку `productsCount` при link/unlink product -> tag.
6. Перевести `tagRelayQuery` на `tagListView`.
7. Исправить `getConnection()` и `totalCount`.
8. Добавить `where`/`orderBy` в `catalogQuery.tags`.
9. Обновить generated backend artifacts.
10. Запустить build.
11. После backend parity обновить Admin UI query variables для server-side search/sort.
