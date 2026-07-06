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

- определять affected products до потери source mapping при delete и операциях,
  меняющих effective value id;
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
- stale/idempotency protection работает по `storeId + entityType + itemId +
  sourceSequence`;
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
| `facet.slug` | Нет | Slug является public alias. Canonical filter input резолвится в `facet.id`, а listing membership key строится по `facetId:valueId`. |
| delete `facet` | Да | Нужно удалить old facet memberships из listing bitmaps. |
| create `facet` с sources/values | Да для affected products | Появляется новый public filter. |
| `facet_source.reference_status` | Да, если VALID/STale меняет membership | Source больше не должен/должен попадать в snapshot. |
| `facet_value.handle` для display value | Нет | Handle является public alias. Canonical filter input резолвится в `facet_value.id`, а listing membership key строится по id. |
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
  | "facet_value_unmerged";

type FacetListingSourceRef = {
  facetType: "TAG" | "FEATURE" | "OPTION";
  sourceHandle: string;
  sourceValueHandle?: string;
  facetId?: string;
  facetValueId?: string;
};

type FacetListingSyncInput = {
  storeId: string;
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

`storeId` является canonical scope для catalog/listing data и передается в
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
нужен для delete/merge/unmerge/reference-state changes, где после mutation часть
mapping может исчезнуть из catalog tables или effective value id изменится.

## Где запускать workflow

Не запускать listing sync внутри repository/script transaction.

Facet mutation flow должен быть таким:

1. До mutation собрать old impact refs и old affected product ids, если операция
   может удалить source mapping или изменить effective value id.
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
  storeId: string;
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

Все queries должны быть scoped by `storeId`. Если конкретная table хранит
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

## Rename facet slug / facet value handle

Переименование `facet.slug` или display `facet_value.handle` не должно запускать
listing sync.

Причина: storefront/admin filter input резолвит canonical public alias в
`facet.id` / `facet_value.id` до обращения к listing. Listing write model для
canonical facets использует membership key `facetId:valueId`, потому изменение
slug/handle не меняет posting membership.

Если в будущем появится path, который пишет facet snapshots без ids и
использует fallback key `facet.type:facet.handle:value.handle`, этот path должен
или быть запрещен для canonical catalog facets, или отдельно мигрироваться перед
тем, как считать rename полностью non-impacting.

## Update facet value enabled

Для display value:

1. Если меняется только `handle`, `label`, `swatchId` или `sortIndex`, workflow
   не нужен.
2. Если меняется `enabled`, до update найти source children этого display value.
3. По каждому child source value построить отдельный source ref
   (`sourceHandle` из связанного `facet_source`, `sourceValueHandle` из
   immutable source `facet_value.handle`).
4. Выполнить update.
5. Повторно найти affected products по тем же refs.
6. Запустить sync.

Для source value:

1. Использовать source value `facetId + handle`, где `handle` это immutable
   normalized source handle.
2. Если source value имеет parent display value, affected products все равно
   ищутся по source value handle, а snapshot resolver сам выберет parent display
   как effective value.
3. После update snapshot resolver сам выберет effective value: parent display
   или source value.

Если changed fields не влияют на `enabled`, `reference_status` или `parent_id`,
workflow не нужен.

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

Требование: для одного product следующий facet sync должен иметь revision больше
предыдущего listing action. Иначе `listing` вернет `ignored_stale`.

Решение: facet listing sync должен опираться на domain event и переиспользовать
существующие helpers:

- `listingSourceRevisionFromEvent`;
- `listingSourceRevisionFromEvents`;
- `ListingSyncPublisher.buildBatchMeta`.

Для facet mutation wrapper рекомендуется эмитить отдельный domain event
`facetListingSyncRequested` с immutable payload affected refs/product ids. Для
reference status changes можно использовать уже существующий
`facetReferenceStateChanged`, потому что он содержит touched source handles,
changed source/value ids и affected display value ids.

Не использовать ad hoc revision из `Date.now()` внутри workflow step: replay или
retry должен давать тот же source revision и тот же idempotency key для одного
operation.

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
  `storeId`;
- запускает affected products script;
- запускает `ListingSnapshotBuildScript`;
- вызывает `ListingSyncPublisher.syncItems` с `storeId`.

### 3. Подключить к mutation flows

Обернуть listing-impacting mutations:

- create/update/delete facet;
- create/update/delete facet value;
- merge/unmerge facet values;
- reference state changes из `catalog.facetReferenceSync`.

Presentation-only updates должны пропускать workflow.

### 4. Pre-read для destructive/effective-id changes

Для delete и операций, которые меняют effective value id, обязательно добавить
pre-read до mutation:

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
- Rename `facet.slug` и display `facet_value.handle` не запускают listing sync
  и не меняют listing bitmap memberships.
- Merge display values обновляет counts/filter results для affected products.
- Unmerge display values возвращает affected products на source value handles.
- `facetReferenceStateChanged` с переходом `VALID <-> STALE` запускает listing
  sync для affected products.
- Presentation-only изменения не запускают listing sync.
- Повтор одного и того же facet sync не создает конфликтов и не дублирует
  membership rows.
- Новый facet listing sync получает `sourceSequence`, который не приводит к
  `ignored_stale` для актуальных affected products.
- Soft-deleted/missing products не ломают workflow.

## Открытые вопросы

- Должен ли `facetReferenceStateChanged` сразу запускать listing sync или только
  публиковать событие для отдельного handler?
- Нужен ли admin-visible статус фоновой переиндексации для массовых facet
  операций?
