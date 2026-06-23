# Проблема global ID в ProductWhereInput

## Суть

Admin GraphQL API отдает entity IDs как GraphQL global IDs, а repository/query layer работает с внутренними database IDs.

Когда generated `ProductWhereInput` открывает фильтр по `id`, клиент может передать API-facing значение:

```graphql
where: {
  id: { _eq: "gid-or-base64-product-id" }
}
```

Но `productRelayQuery` и база ожидают обычный product UUID:

```ts
where: {
  id: { _eq: "018f..." }
}
```

Из-за этого фильтр по `id` проходит через GraphQL schema как валидный input, но не соответствует storage-формату.

## Где проявляется

Проблема касается любых generated where-фильтров, которые принимают ID поля с GraphQL global ID semantics:

- прямой фильтр `where.id`;
- вложенные варианты внутри `_and`, `_or`, `_not`;
- будущие relation ID filters, если product relay query будет расширен relations.

Пример вложенного случая:

```ts
{
  _or: [
    { id: { _eq: "global-product-id-1" } },
    { _and: [{ id: { _in: ["global-product-id-2"] } }] },
  ],
}
```

## Почему это отдельная проблема

Generated drizzle-query schema описывает форму фильтра и SQL-capable поля, но не знает о GraphQL global ID contract. Для `drizzle-query` поле `id` является обычным database field.

Поэтому между GraphQL boundary и repository execution появляется mismatch:

- GraphQL layer принимает public API ID;
- repository layer ожидает internal ID;
- generated input сам по себе не делает decode;
- tenant/soft-delete filters не решают эту проблему, потому что они добавляются отдельно внутри repository.

## Симптомы

В зависимости от типа колонки и драйвера возможны два результата:

- запрос возвращает пустой список, хотя продукт существует;
- база отклоняет значение как ID неправильного формата.

`where` по не-ID полям, например `handle`, `createdAt`, `updatedAt`, этой проблемы не имеет.
