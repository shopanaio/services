# Фаза 2. Batch API для posting bitmap memberships

## Цель

Уменьшить количество SQL операций при обновлении bitmap memberships. Текущий
single-item writer заменяет memberships по одному product/variant doc id и по
одному field. Batch writer должен передавать набор memberships и выполнять
delta по `valueKey -> docIds[]`.

## Scope

В фазу входят:

- `replaceProductMembershipsBatch`;
- `replaceVariantMembershipsBatch`;
- helper для чтения current memberships по массиву doc ids;
- общий алгоритм delta calculation;
- счетчики для observability;
- сохранение существующих single-item методов.

В фазу не входят:

- batch writer;
- workflow routing;
- facet/product event changes.

## Новый API

```ts
replaceProductMembershipsBatch(input: Array<{
  productDocId: number;
  field: PostingField;
  nextValueKeys: readonly string[];
  valueKeyPrefixes?: readonly string[];
}>): Promise<PostingMembershipReplaceResult>;

replaceVariantMembershipsBatch(input: Array<{
  variantDocId: number;
  field: PostingField;
  nextValueKeys: readonly string[];
  valueKeyPrefixes?: readonly string[];
}>): Promise<PostingMembershipReplaceResult>;
```

Single-item методы должны остаться публично совместимыми:

- `replaceProductMemberships`;
- `replaceVariantMemberships`;
- `deleteProductMemberships`;
- `deleteVariantMemberships`.

Допустимо реализовать single-item методы поверх batch API, если это не меняет
их observable behavior.

## Current memberships read

Нужен read helper:

```ts
getMembershipKeysForDocIds(input: {
  entityType: PostingEntityType;
  docIds: readonly number[];
  field: PostingField;
  valueKeyPrefixes?: readonly string[];
}): Promise<Map<number, PostingKeyInput[]>>;
```

Правила:

- `docIds` нормализуются до unique sorted positive integers;
- empty input возвращает empty map;
- фильтр по `valueKeyPrefixes` повторяет семантику single-item
  `replace...Memberships`;
- запрос группируется по `entityType + field`, чтобы не смешивать product и
  variant postings.

## Delta algorithm

Для каждой группы `entityType + field`:

1. Получить current memberships для всех doc ids группы.
2. Нормализовать `nextValueKeys` до unique sorted массива.
3. Проверить, что `nextValueKeys` соответствует `valueKeyPrefixes`, если
   prefixes заданы.
4. Для каждого doc id вычислить:
   - `valueKeysToAdd`;
   - `valueKeysToRemove`.
5. Перевернуть delta:
   - `Map<valueKey, docIdsToAdd[]>`;
   - `Map<valueKey, docIdsToRemove[]>`.
6. Для каждого `valueKey` вызвать существующие bitmap operations:
   - `addDocIds({ valueKey, docIds })`;
   - `removeDocIds({ valueKey, docIds })`.

Сложность должна перейти от:

```text
products * fields * valueKeys * SQL
```

к:

```text
changedValueKeys * SQL
```

## Result shape

`PostingMembershipReplaceResult` должен быть достаточно информативным для logs:

```ts
type PostingMembershipReplaceResult = {
  touchedDocIds: number;
  valueKeysAdded: number;
  valueKeysRemoved: number;
  docIdsAdded: number;
  docIdsRemoved: number;
};
```

Если текущий тип уже существует, расширять его нужно совместимо с callers.

## Transaction behavior

Batch bitmap API не открывает transaction самостоятельно, если repository layer
уже выполняется внутри `runListingIndexItemTransaction`. Он должен использовать
текущий connection/transaction context.

Ошибки валидации input должны возникать до SQL mutation, насколько это
возможно.

## Edge cases

- Empty batch возвращает zero counters.
- Пустой `nextValueKeys` удаляет все memberships doc id в указанном field и
  prefix scope.
- `valueKeyPrefixes` ограничивает только managed namespace.
- Один doc id может иметь несколько fields в одном writer chunk; они должны
  обрабатываться как разные группы.
- Duplicate doc id + same field в одном input должен быть либо отклонен, либо
  deterministic coalesced до одного entry. Предпочтительно отклонять duplicate,
  чтобы batch writer не скрывал ошибку merge payload.

## Acceptance criteria

- Добавлены product и variant batch methods.
- Current memberships читаются одним запросом на группу `entityType + field`.
- Delta переворачивается в `valueKey -> docIds[]`.
- Single-item bitmap API не меняет контракт.
- Метрики добавлений/удалений доступны batch writer-у.
- Batch API работает внутри внешней transaction boundary.
