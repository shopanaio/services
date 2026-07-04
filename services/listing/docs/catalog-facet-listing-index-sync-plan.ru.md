# План синхронизации listing index при изменениях facets

## Контекст

В `catalog` есть canonical модель facets:

- `facet` описывает публичный фильтр и его `slug`;
- `facet_source` связывает facet с raw source (`TAG`, `FEATURE`, `OPTION`);
- `facet_value.kind = 'source'` хранит raw source value;
- `facet_value.kind = 'display'` группирует source values в пользовательское значение;
- `facet_value.parent_id` задает effective display value для source value;
- `reference_status`, `enabled`, `handle` влияют на то, попадет ли value в listing snapshot.

В `listing` уже есть публичный update contract:

- `listing.syncSellableItem`;
- `listing.syncSellableItems`;
- `listing.deleteSellableItem`.

Контракт intentionally принимает полный `ListingSellableItemSnapshot`, а не
дельты физического индекса. `catalog` сообщает, каким должен быть sellable item
для листинга, а `listing` сам заменяет posting memberships, roaring bitmaps,
sort/search rows и derived tables.

## Цель

Добавить надежный путь переиндексации listing index после изменений facets,
которые меняют публичные facet memberships или effective facet value handles.

Система должна:

- определять affected products до потери source mapping при delete/rename;
- строить актуальные full snapshots через существующий
  `ListingSnapshotBuildScript`;
- отправлять snapshots через `ListingSyncPublisher.syncItems`;
- позволять `listing` удалить старые facet roaring bitmap memberships через
  существующий replace path;
- не запускать listing sync для чисто presentation-изменений.

## Non-goals

- Не добавлять facet-only patch API в `listing`.
- Не писать напрямую в `listing.listing_posting_bitmap` из `catalog`.
- Не передавать labels, translations, swatches, ui type или sort presentation
  metadata в listing update API.
- Не менять read API facets в рамках этого плана.
- Не делать глобальный rebuild всего project index как основной механизм.

## Ключевое решение

При изменении facet state `catalog` синхронизирует **affected sellable items
full snapshot-ом**.

Причины:

- текущий listing write path реализован как replace by item snapshot;
- stale/idempotency protection работает по `projectId + entityType + itemId +
  sourceRevision`;
- merge/unmerge display values меняет effective value без изменения raw source
  assignment;
- variant-level option facets должны обновлять parent product item;
- full snapshot гарантированно удаляет старые bitmap memberships, которых больше
  нет в актуальном item state.

## Что считается listing-impacting изменением

| Изменение | Нужно sync listing? | Почему |
| --- | --- | --- |
| `facet.label` | Нет | Presentation metadata не входит в snapshot. |
| `facet.uiType` | Нет | UI presentation. |
| `facet.selectionMode` | Нет | UI/query contract metadata, не membership. |
| `facet.lexoRank` | Нет | Порядок facets читается из catalog/canonical API. |
| `facet.slug` | Да | Меняется public facet handle в filter input/value keys. |
| delete `facet` | Да | Нужно удалить old facet memberships из listing bitmaps. |
| create `facet` с sources/values | Да для affected products | Появляется новый public filter. |
| `facet_source.reference_status` | Да, если VALID/STale меняет membership | Source больше не должен/должен попадать в snapshot. |
| `facet_value.handle` для display value | Да | Меняется public value handle. |
| `facet_value.enabled` | Да | Value появляется/исчезает из snapshot. |
| `facet_value.reference_status` для source value | Да | Source value появляется/исчезает из snapshot. |
| source value attach/detach к display value | Да | Меняется effective value id/handle. |
| merge/unmerge display values | Да | Меняется mapping raw source value -> effective display value. |
| `facet_value.label` | Нет | Presentation metadata. |
| `facet_value.swatchId` | Нет | Presentation metadata. |
| `facet_value.sortIndex` | Нет | Порядок значений facets не является posting membership. |

## Общая архитектура

Добавить catalog workflow:

```ts
catalog.syncListingForFacetChange
```

Workflow принимает immutable payload с affected source refs и product ids,
строит snapshots и вызывает `listing.syncSellableItems`.

Рекомендуемый payload:

```ts
type FacetListingSyncReason =
  | "facet_created"
  | "facet_updated"
  | "facet_deleted"
  | "facet_value_created"
  | "facet_value_updated"
  | "facet_value_deleted"
  | "facet_value_merged"
  | "facet_value_unmerged"
  | "facet_reference_state_changed";

type FacetListingSourceRef = {
  facetType: "TAG" | "FEATURE" | "OPTION";
  sourceHandle: string;
  sourceValueHandle?: string;
  facetId?: string;
  facetValueId?: string;
};

type FacetListingSyncInput = {
  projectId: string;
  storeId: string;
  organizationId: string;
  userId?: string;
  reason: FacetListingSyncReason;
  sourceRefs: FacetListingSourceRef[];
  productIds?: string[];
  occurredAt: string;
  operationId: string;
};
```

`projectId` является canonical scope для catalog/listing data и передается в
`listing.syncSellableItems`. `storeId` нужен для получения store context,
default locale и tenant metadata. В текущей модели они могут совпадать, но
workflow payload не должен полагаться на это неявно.

`FacetListingSourceRef` описывает конкретный raw source value, по которому можно
найти affected products. `sourceHandle` равен `facet_source.handle`.
`sourceValueHandle` равен immutable normalized handle source `facet_value`
(`facet_value.kind = 'source'`), а не public display handle. Для `OPTION` и
`FEATURE` это composite handle вида `source:value`, например `color:red` или
`colour:красный`.

Если один display value группирует source values из нескольких sources, например
`color:red` и `colour:красный`, impact detector должен разворачивать display
value в отдельный `FacetListingSourceRef` на каждый child source value.
`facetValueId` в таком ref указывает на source value child, а не на display
value.

`productIds` нужен для операций, где affected set уже известен точно. `sourceRefs`
нужен для rename/delete/merge, где после mutation часть mapping может исчезнуть
из catalog tables.

## Где запускать workflow

Не запускать listing sync внутри repository/script transaction.

Facet mutation flow должен быть таким:

1. До mutation собрать old impact refs и old affected product ids, если операция
   может удалить или переименовать source mapping.
2. Выполнить facet mutation в script/workflow.
3. После successful commit собрать new impact refs и new affected product ids,
   если новое состояние тоже может добавлять memberships.
4. Объединить old + new affected product ids.
5. Запустить `catalog.syncListingForFacetChange`.

Для операций, которые уже выполняются только как `BaseScript` из GraphQL resolver,
лучше добавить тонкий workflow wrapper вокруг script. Он будет отвечать за:

- pre-read impact;
- запуск script;
- post-read impact;
- enqueue listing sync workflow;
- возврат исходного mutation result.

## Поиск affected products

Нужен отдельный script:

```ts
FacetListingAffectedProductsScript
```

Вход:

```ts
type FacetListingAffectedProductsParams = {
  projectId: string;
  storeId: string;
  sourceRefs: FacetListingSourceRef[];
  productIds?: string[];
};
```

Выход:

```ts
type FacetListingAffectedProductsResult = {
  productIds: string[];
};
```

Правила lookup:

| Facet type | Affected products |
| --- | --- |
| `TAG` | `product_tag -> tag`, где `facet_source.handle = 'tags'` и `tag.handle = sourceValueHandle`. Если `sourceValueHandle` не задан, брать все products с любым tag. |
| `FEATURE` | `product_feature.slug = sourceHandle`; если задан `sourceValueHandle`, дополнительно match normalized handle `${product_feature.slug}:${product_feature_value.slug}` = `sourceValueHandle`. Исключать group features. |
| `OPTION` | `product_option.slug = sourceHandle`; если задан `sourceValueHandle`, дополнительно match normalized handle `${product_option.slug}:${product_option_value.slug}` = `sourceValueHandle`; через `product_option_variant_link -> variant.product_id`. |

Все queries должны быть scoped by `projectId`. Если конкретная table хранит
`storeId` как отдельный ключ, дополнительно фильтровать по `storeId`. Affected
lookup должен исключать soft-deleted products/variants.

## Snapshot effective facet value resolution

`ListingSnapshotBuildScript` не пишет raw source value в listing snapshot
напрямую. Для `TAG`, `FEATURE` и `OPTION` snapshot должен содержать effective
public value: parent display value, если source value сгруппирован, иначе сам
source value.

Алгоритм:

1. Для каждого raw product/variant source value построить normalized source
   value handle:
   - `TAG`: `tag.handle`;
   - `FEATURE`:
     `${product_feature.slug}:${product_feature_value.slug}`;
   - `OPTION`: `${product_option.slug}:${product_option_value.slug}`.
2. Найти source `facet_value`:
   - `facet_value.kind = 'source'`;
   - `facet_value.handle = normalized source value handle`;
   - `facet_value.enabled = true`;
   - `facet_value.reference_status = 'VALID'`.
3. Если source value имеет `parent_id`, загрузить parent display value:
   - `facet_value.kind = 'display'`;
   - `facet_value.parent_id IS NULL`;
   - `facet_value.enabled = true`;
   - `facet_value.reference_status = 'VALID'`.
4. В `ListingSellableItemSnapshot.productFacets` /
   `ListingVariantSnapshot.facets` записать effective value:
   - parent display value, если он есть;
   - иначе source value.
5. `listing` получает только effective public value:
   - `values[].id = effectiveFacetValue.id`;
   - `values[].handle = effectiveFacetValue.handle`.

Важно: source child value должен пройти собственные проверки `enabled = true` и
`reference_status = 'VALID'` даже когда effective value является display parent.
Иначе stale source child продолжит попадать в listing через always-valid display
value.

## Delete facet

Для delete `facet` важно собрать affected products **до удаления facet**, потому
что после delete исчезнут `facet_source` и `facet_value` rows.

Порядок:

1. По `facetId` загрузить:
   - facet type;
   - facet slug;
   - facet sources;
   - source values;
   - display values и их children.
2. Построить source refs для всех source values, которые сейчас могут давать
   membership.
3. Найти affected products по этим refs.
4. Удалить facet.
5. Запустить listing sync для affected products.

Новый snapshot после удаления facet будет собран без него:

- `ListingSnapshotBuildScript.loadFacetSources()` больше не увидит удаленный
  `facet`;
- `buildProductFacetSelections()` и `buildVariantFacetSelections()` не добавят
  этот facet в snapshot.

В `listing` старые roaring bitmap memberships удалятся через replace path:

- `ListingBuildSyncWriteModelScript` построит `productPostingValueKeys.facet` и
  `variantFacetValueKeysByVariantId` без удаленного facet;
- `ListingWriteIndexActionScript` вызовет `replaceProductMemberships(...,
  field: "facet")` и `replaceVariantMemberships(..., field: "facet")`;
- `ListingPostingBitmapRepository.replaceMemberships()` удалит `docId` из всех
  old value keys, которых нет в новом snapshot;
- если bitmap cardinality станет `0`, строка `listing_posting_bitmap` будет
  удалена.

## Rename facet slug

При изменении `facet.slug` old и new snapshots отличаются только public facet
handle/value keys.

Порядок:

1. До update сохранить old facet slug и affected source refs.
2. Выполнить update.
3. Найти affected products по old/new refs.
4. Запустить full snapshot sync.

`listing` удалит old `facetId:valueId`/fallback value keys из bitmap membership
и добавит new keys.

## Update facet value handle / enabled

Для display value:

1. До update найти source children этого display value.
2. По каждому child source value построить отдельный source ref
   (`sourceHandle` из связанного `facet_source`, `sourceValueHandle` из
   immutable source `facet_value.handle`).
3. Выполнить update.
4. Повторно найти affected products по тем же refs.
5. Запустить sync.

Для source value:

1. Использовать source value `facetId + handle`, где `handle` это immutable
   normalized source handle.
2. Если source value имеет parent display value, affected products все равно
   ищутся по source value handle, а snapshot resolver сам выберет parent display
   как effective value.
3. После update snapshot resolver сам выберет effective value: parent display
   или source value.

Если изменился только `label`, `swatchId` или `sortIndex`, workflow не нужен.

## Merge / unmerge

Merge/unmerge меняет effective value для raw source values, поэтому всегда
listing-impacting.

Порядок:

1. До операции сохранить source value ids и их immutable normalized source
   handles.
2. Выполнить merge/unmerge.
3. Найти affected products по source refs.
4. Запустить full snapshot sync.

Для merge в новый display value snapshot будет содержать display `id/handle`.
Для unmerge snapshot вернется к source value `id/handle` или к другому display
value, если source был присоединен заново.

## Create facet / facet value

Create может добавлять новый public filter для уже существующих products.

Порядок:

1. После create построить source refs из созданных sources/source values.
2. Найти affected products.
3. Запустить sync.

Если created facet не имеет VALID source values или все values disabled, affected
products можно не синкать.

## Source revision и idempotency

Для facet-origin listing sync использовать synthetic source revision:

```ts
listingSourceRevisionFromEvent(event)
```

Если workflow не эмитит отдельное domain event, нужен deterministic revision:

```ts
Date.parse(occurredAt) * 1000 + stable suffix from operationId
```

Требование: для одного product следующий facet sync должен иметь revision больше
предыдущего listing action. Иначе `listing` вернет `ignored_stale`.

Рекомендуется эмитить domain event `facetListingSyncRequested` или
`facetReferenceStateChanged` и переиспользовать существующие helpers:

- `listingSourceRevisionFromEvent`;
- `listingSourceRevisionFromEvents`;
- `ListingSyncPublisher.buildBatchMeta`.

## Batch strategy

`listing.syncSellableItems` рекомендуется вызывать chunks до 100 items.

Workflow должен:

- dedupe product ids;
- chunks by 100;
- для каждого chunk строить snapshots через `ListingSnapshotBuildScript`;
- логировать missing products как warning, если product был soft-deleted;
- возвращать partial result, если часть chunks не была accepted.

## Ошибки и retries

- Lookup affected products должен быть retryable.
- `listing.syncSellableItems` уже fan-out-ит item workflows в listing queue.
- Повтор workflow с тем же `operationId` должен давать тот же idempotency key.
- Если affected product был удален между lookup и snapshot build, это не fatal:
  listing sync для него можно пропустить, потому что product delete path должен
  вызывать `listing.deleteSellableItem`.

## Реализация по шагам

### 1. Impact detector для facet mutations

Добавить helpers/scripts:

- `FacetListingImpactBuildScript`;
- `FacetListingAffectedProductsScript`.

Они должны уметь строить `FacetListingSourceRef[]` для:

- facet by id;
- facet value by id;
- source value ids;
- display value ids;
- explicit product ids.

### 2. Workflow wrapper

Добавить `FacetListingSyncWorkflow`:

- принимает `FacetListingSyncInput`;
- получает store context по `storeId` и проверяет, что он относится к
  `projectId`;
- запускает affected products script;
- запускает `ListingSnapshotBuildScript`;
- вызывает `ListingSyncPublisher.syncItems` с `projectId`.

### 3. Подключить к mutation flows

Обернуть listing-impacting mutations:

- create/update/delete facet;
- create/update/delete facet value;
- merge/unmerge facet values;
- reference state changes из `catalog.facetReferenceSync`.

Presentation-only updates должны пропускать workflow.

### 4. Delete/rename pre-read

Для delete/rename обязательно добавить pre-read до mutation:

- old facet sources;
- old source value handles;
- old display children;
- affected product ids.

Эти данные передавать в workflow payload, чтобы после delete не зависеть от
удаленных rows.

### 5. Observability

Логировать:

- `operationId`;
- `reason`;
- `storeId`;
- count source refs;
- count affected products;
- count snapshots;
- listing batch status.

### 6. Verification

Не запускать `test`/`tsc` согласно проектным правилам.

Для проверки новой версии кода запускать только build через project-approved
команду, когда реализация будет готова.

## Acceptance criteria

- Удаление facet удаляет старые product/variant facet memberships из
  `listing_posting_bitmap` после sync affected products.
- Rename `facet.slug` не оставляет старые filter value keys в bitmaps.
- Merge display values обновляет counts/filter results для affected products.
- Unmerge display values возвращает affected products на source value handles.
- Presentation-only изменения не запускают listing sync.
- Повтор одного и того же facet sync не создает конфликтов и не дублирует
  membership rows.
- Soft-deleted/missing products не ломают workflow.

## Открытые вопросы

- Нужен ли отдельный domain event для facet listing sync или достаточно прямого
  workflow wrapper после mutation?
- Должен ли `facetReferenceStateChanged` сразу запускать listing sync или только
  публиковать событие для отдельного handler?
- Нужен ли admin-visible статус фоновой переиндексации для массовых facet
  операций?
