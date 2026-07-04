# Перманентный перенос ownership facets из catalog в listing

## Цель

Перманентно перенести весь домен `facets*` из `catalog` service в `listing` service без обратной совместимости.

Перенос включает ownership БД, GraphQL API, resolvers, loaders, scripts, repositories, models, migrations, events, workflows, generated schemas/types, runtime SQL listing и все imports/call sites, которые сейчас считают facets частью catalog.

## Не входит в задачу

- Не оставлять compatibility aliases в `catalogQuery` или `catalogMutation`.
- Не делать временные proxy resolvers из catalog в listing.
- Не оставлять shared write ownership над одними и теми же facet tables.
- Не редактировать changeset файлы вручную.

## Текущая карта ownership

Catalog сейчас владеет admin facets API:

- Schema: `services/catalog/src/api/graphql-admin/schema/facet.graphql`
- Query methods: `facet`, `facets`, `facetSourceCandidates`, `facetValueCandidates`, `facetValue`, `facetValues`, `facetSwatch`, `facetSwatches`
- Mutation methods: `facetCreate`, `facetUpdate`, `facetDelete`, `facetMove`, `facetRebalance`, `facetValueCreate`, `facetValueUpdate`, `facetValueMerge`, `facetValueUnmerge`, `facetValueDelete`, `facetSwatchCreate`, `facetSwatchUpdate`, `facetSwatchDelete`
- Resolvers: `FacetResolver`, `FacetValueResolver`, `FacetSwatchResolver`, candidate connection resolvers
- Loaders: `FacetLoader`, `FacetValueLoader`, `FacetSwatchLoader`
- Scripts: все под `services/catalog/src/scripts/facet`
- Repositories: `FacetRepository`, `FacetValueRepository`, `FacetSwatchRepository`, `FacetReferenceRepository`
- Models: `services/catalog/src/repositories/models/facet.ts`, candidate view models, model exports
- Migrations: `services/catalog/migrations/domains/0500_facets`
- Workflow: `FacetReferenceSyncWorkflow`, зарегистрирован как `catalog.facetReferenceSync`
- Event emission source/actor strings: сейчас `catalog`
- Product/option/feature/tag mutation hooks, которые emit-ят facet reference changes и запускают `catalog.facetReferenceSync`

Listing сейчас потребляет facets как runtime metadata:

- `services/listing/src/repositories/models/catalogFacetRuntime.ts` мапит `catalog.facet` и `catalog.facet_value`
- Storefront SQL делает joins к `catalog.facet`, `catalog.facet_value`, `catalog.facet_translation`, `catalog.facet_value_translation`
- `services/listing/src/api/graphql-admin/schema/listing.graphql` расширяет `FacetSwatch` как catalog-owned type
- Listing index write model хранит facet value keys и использует facets для filtering/counts

## Целевой ownership

Listing становится единственным владельцем facets:

- Facet tables живут в schema `listing`.
- Listing GraphQL exposes listing query API и facet admin API.
- Facet mutations находятся под `listingMutation`, не под `catalogMutation`.
- Facet queries находятся под `listingQuery`, не под `catalogQuery`.
- Facet global IDs по возможности остаются теми же entity types: `Facet`, `FacetValue`, `FacetSwatch`.
- Events от facet operations используют `source: "listing"` и service actor `listing`.
- Reference sync workflow зарегистрирован как `listing.facetReferenceSync`.
- Catalog emit-ит только product/tag/option/feature domain events; listing реагирует на них и reconciles facet references.
- Catalog не вызывает listing напрямую для facet reference sync или listing index sync.
- Listing становится event-driven consumer catalog events и сам решает, когда читать catalog snapshots/source universe через broker actions.
- В catalog после cleanup нет facet ownership repositories, loaders, scripts, models, migrations или GraphQL fields.
- Catalog сохраняет catalog-owned read/query broker actions для products/tags/options/features, потому что source universe не является facet write ownership.

## Целевая event-driven модель catalog -> listing

Текущая модель смешанная: catalog mutation/workflow emit-ит domain events, но часть синхронизации listing запускается прямым вызовом listing broker actions из catalog, а facet sync запускается из catalog handlers. После переноса facets это нужно выровнять.

Целевая модель:

- Catalog является system of record для products, variants, tags, options, features, categories и их assignment data.
- Catalog не знает о listing index и не инициирует listing write workflows напрямую.
- Catalog после write operation emit-ит domain events с минимально достаточными changed-field hints, ids, revisions и compact reference refs там, где они уже доступны в write path.
- Listing регистрирует event handlers для catalog domain events.
- Listing handlers запускают listing-owned workflows:
  - listing index sync/delete workflows;
  - `listing.facetReferenceSync`.
- Listing handlers/workflows при необходимости читают catalog через broker read API, а не через imports catalog models и не через `JOIN catalog.*`.
- Events являются trigger/change hint, но не заменяют catalog read API и не должны становиться полной копией catalog snapshot.

Высокоуровневый поток:

1. Catalog mutation/workflow writes catalog-owned data.
2. Catalog emits `productCreated`, `productUpdated`, `productDeleted`, tag/option/feature/category lifecycle events.
3. Events service dispatches events to listing handlers.
4. Listing handler decides affected listing work:
   - rebuild/sync/delete listing index item;
   - reconcile affected facet references.
5. Listing calls catalog read/query actions only when event payload does not contain enough data.
6. Listing writes only listing-owned tables.

Важное правило: не добавлять новый прямой path `catalog -> listing` для facets. Если во время реализации переносится listing index sync, старый `ListingSyncPublisher` path из catalog должен быть удален или помечен как временный cleanup item в этом же переносе.

## Catalog read/query broker API

Чтобы listing и другие services не зависели от catalog DB schema, нужен универсальный catalog read contract. Он не должен называться facet API и не должен кодировать listing/facet ownership. Facets используют этот contract как один из consumers.

### Product snapshot actions

Добавить read/query actions:

- `catalog.productSnapshot`
- `catalog.productSnapshots`

`catalog.productSnapshot`:

```ts
interface CatalogProductSnapshotParams {
  storeId: string;
  productId: string;
  include?: CatalogProductSnapshotInclude;
}

interface CatalogProductSnapshotResult {
  product: CatalogProductSnapshot | null;
}
```

`catalog.productSnapshots`:

```ts
interface CatalogProductSnapshotsParams {
  storeId: string;
  where?: CatalogProductSnapshotWhere;
  include?: CatalogProductSnapshotInclude;
  orderBy?: CatalogProductSnapshotOrderBy[];
  first?: number;
  after?: string;
}

interface CatalogProductSnapshotsResult {
  edges: Array<{
    cursor: string;
    node: CatalogProductSnapshot;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  totalCount: number;
}
```

Минимальный `where`:

```ts
interface CatalogProductSnapshotWhere {
  productIds?: string[];
  variantIds?: string[];
  categoryIds?: string[];
  tagIds?: string[];
  tagHandles?: string[];
  optionValues?: Array<{
    optionId?: string;
    optionHandle?: string;
    valueId?: string;
    valueHandle?: string;
  }>;
  featureValues?: Array<{
    featureId?: string;
    featureHandle?: string;
    valueId?: string;
    valueHandle?: string;
  }>;
  status?: "draft" | "published";
  entityTypes?: Array<"product" | "bundle">;
  deleted?: "exclude" | "include" | "only";
  updatedAfter?: string;
}
```

Минимальный `include`:

```ts
interface CatalogProductSnapshotInclude {
  variants?: boolean;
  categories?: boolean;
  tags?: boolean;
  options?: boolean;
  features?: boolean;
  media?: boolean;
  seo?: boolean;
  inventoryRefs?: boolean;
}
```

`CatalogProductSnapshot` должен быть стабильным broker contract для consumers. Он может быть уже, чем GraphQL product type, но должен содержать достаточно данных для listing index write model при соответствующих `include`.

### Product attribute/source actions

Для facet candidate API и facet reference sync нужен generic source universe contract:

- `catalog.productAttributeSources`
- `catalog.productAttributeRefsExist`

`catalog.productAttributeSources`:

```ts
interface CatalogProductAttributeSourcesParams {
  storeId: string;
  locale?: string;
  kinds?: Array<"tag" | "option" | "feature" | "category">;
  where?: {
    ids?: string[];
    handles?: string[];
    productIds?: string[];
    search?: string;
  };
  includeValues?: boolean;
  exclude?: Array<
    | { kind: "tag"; handle: string }
    | { kind: "option"; sourceHandle: string; valueHandle?: string }
    | { kind: "feature"; sourceHandle: string; valueHandle?: string }
    | { kind: "category"; handle: string }
  >;
  orderBy?: Array<{ field: string; direction: "asc" | "desc" }>;
  first?: number;
  after?: string;
}
```

Catalog должен применять `where`, `exclude`, `orderBy` и pagination в одном catalog query до возврата результата. Listing не должен делать post-pagination filtering.

`catalog.productAttributeRefsExist`:

```ts
interface CatalogProductAttributeRefsExistParams {
  storeId: string;
  refs: Array<
    | { kind: "tag"; handle: string }
    | { kind: "option"; sourceHandle: string; valueHandle?: string }
    | { kind: "feature"; sourceHandle: string; valueHandle?: string }
    | { kind: "category"; handle: string }
  >;
}

interface CatalogProductAttributeRefsExistResult {
  existingRefs: CatalogProductAttributeRefsExistParams["refs"];
}
```

Existence semantics:

- Tag value exists if tag handle exists in catalog for the store.
- Option source exists if at least one non-deleted catalog product has an option with that source handle, unless catalog later promotes options to store-level entities.
- Option value exists if at least one non-deleted catalog product has source/value handle pair.
- Feature source/value follows the same non-deleted product scope.
- Category exists by catalog category handle/id according to the ref shape.

### Event payload policy

Events should be improved but not overloaded:

- `productCreated` should include `revision`, `entityType`, and optionally compact refs/snapshot hints if available, but listing must be able to call `catalog.productSnapshot`.
- `productUpdated` should continue using partial snapshot/change hints and include `facetReferenceRefs` for option/feature/tag changes when write path already has before/after handles.
- `productDeleted` should include `facetReferenceRefs` captured before delete, as current `ProductDeleteScript` already does.
- Tag/option/feature/category lifecycle events should include before/after handles and ids so listing can reconcile by refs without reading full product snapshots.
- Events are not source of truth for existence. Listing uses `catalog.productAttributeRefsExist` when it needs current source universe state.

## Phase 1. Подготовить facet domain в listing

1. Добавить listing facet database models:
   - Перенести/адаптировать `facet`, `facetTranslation`, `facetSource`, `facetSourceTranslation`, `facetSwatch`, `facetValue`, `facetValueTranslation`.
   - Использовать `listingSchema`, не `catalogSchema`.
   - Сохранить стабильные table names внутри listing schema: `listing.facet`, `listing.facet_translation`, `listing.facet_source`, `listing.facet_source_translation`, `listing.facet_swatch`, `listing.facet_value`, `listing.facet_value_translation`.
   - Перенести `referenceStatusEnum` или определить эквивалентный enum в listing.

2. Не переносить candidate view models как listing-owned DB views:
   - `facetSourceCandidateView`
   - `facetTagValueCandidateView`
   - `facetOptionValueCandidateView`
   - `facetFeatureValueCandidateView`
   - Candidate universe для tags/options/features остается catalog-owned source data.
   - Listing facet API вызывает generic catalog read/query contract и передает listing-owned exclusions.

3. Заменить `catalogFacetRuntime.ts`:
   - Удалить catalog runtime aliases.
   - Экспортировать canonical listing-owned facet models из listing models.
   - Обновить все listing repository imports на listing facet models.

## Phase 2. Перенести migrations

1. Создать новый listing migration domain для facets, например:
   - `services/listing/migrations/domains/0200_facets/0200_facets__tables.sql`
   - `0201_facets__values.sql`
   - `0202_facets__sources.sql`
   - candidate views в listing не создавать.

2. Адаптировать SQL из catalog:
   - Заменить schema `"catalog"` на `"listing"` для facet tables.
   - Не переносить catalog candidate views в `listing`.
   - Любая listing migration для facets должна создавать только listing-owned facet tables/relations/indexes.
   - Candidate universe, зависящий от products/tags/options/features, остается в catalog service и доступен listing только через broker actions.

3. Добавить destructive catalog cleanup migration:
   - Drop old catalog facet candidate views, если они завязаны на catalog facet tables.
   - Если catalog candidate provider использует DB views, пересоздать их как raw source candidate views без dependency на `catalog.facet*`.
   - Drop catalog facet source/value/source translation/value translation/swatch/facet tables.
   - Drop catalog-only indexes для facet candidate dependencies, если они больше не нужны.

4. Data migration policy:
   - Так как stage/production data и users отсутствуют, а обратная совместимость не нужна, предпочесть clean schema move вместо dual-write migration.
   - Если нужно сохранить local/dev data, добавить явный one-shot SQL copy из `catalog.*facet*` в `listing.*facet*` перед drop catalog tables.

## Phase 3. Перенести repositories и loaders

1. Перенести repository files из catalog в listing:
   - `FacetRepository`
   - `FacetValueRepository`
   - `FacetSwatchRepository`
   - `FacetReferenceRepository`

2. Обновить repository dependencies:
   - `BaseRepository` imports должны использовать listing kernel/context types.
   - Models должны импортироваться из `services/listing/src/repositories/models`.
   - `LexoRankRepository` сейчас catalog-local; либо перенести его в listing, либо вынести в shared package, если он нужен другим services.

3. Зарегистрировать в `services/listing/src/repositories/Repository.ts`:
   - Добавить `facet`, `facetValue`, `facetSwatch`, `facetReference`.
   - Создавать их в `Repository.create`.

4. Перенести loaders:
   - `FacetLoader`
   - `FacetValueLoader`
   - `FacetSwatchLoader`

5. Зарегистрировать listing loaders:
   - Добавить facet loaders в `services/listing/src/loaders/Loader.ts`.
   - Удалить facet loaders из `services/catalog/src/loaders/Loader.ts`.

## Phase 4. Перенести scripts и validation

1. Перенести `services/catalog/src/scripts/facet` в `services/listing/src/scripts/facet`.

2. Обновить script imports:
   - Kernel/base script imports на listing kernel.
   - Repository access на listing repository.
   - Shared helper imports вроде `facetReferenceRefs` и `facets`.

3. Сохранить все текущие domain operations:
   - create/update/delete facet
   - move/rebalance facet
   - create/update/delete facet value
   - merge/unmerge facet values
   - create/update/delete swatch
   - resolve facets

4. Удалить catalog exports для facet scripts.

## Phase 5. Перенести GraphQL API

1. Добавить listing facet schema:
   - Перенести `facet.graphql` в `services/listing/src/api/graphql-admin/schema/facet.graphql`.
   - Добавить ее в listing GraphQL server schema loading.
   - Согласовать common scalar/base dependencies с listing schema.

2. Изменить API namespace:
   - Перенести query fields из `catalogQuery` в `listingQuery`.
   - Перенести mutation fields из `catalogMutation` в `listingMutation`.
   - Не оставлять catalog aliases.

3. Перенести resolvers:
   - `FacetResolver`
   - `FacetValueResolver`
   - `FacetSwatchResolver`
   - `FacetSourceCandidateResolver`
   - `FacetValueCandidateResolver`
   - `FacetSourceCandidateConnectionResolver`
   - `FacetValueCandidateConnectionResolver`

4. Обновить resolver base class:
   - Заменить `CatalogType` на listing resolver base type.
   - Использовать listing context, listing kernel, listing loaders.

5. Обновить Federation ownership:
   - `FacetSwatch` должен быть defined/owned by listing, а не extended как catalog-owned.
   - Удалить `extend type FacetSwatch ... owned by Catalog` из listing schema и определить concrete type в listing facet schema.
   - Удалить catalog ownership для `Facet`, `FacetValue`, `FacetSwatch`.

6. Перегенерировать generated GraphQL types/schemas через project codegen flow.

## Phase 6. Перенести reference sync workflow и listing sync на event-driven модель

1. Перенести workflow files:
   - `FacetReferenceSyncWorkflow.ts`
   - `FacetReferenceSyncWorkflowDto.ts`

2. Зарегистрировать в listing module:
   - Добавить workflow provider в `services/listing/src/listing.module.ts`.
   - Зарегистрировать под listing broker feature.
   - Workflow name становится `listing.facetReferenceSync`.
   - Constructor использует `@InjectBroker("listing")`.

3. Добавить listing event handlers:
   - Создать listing-owned handler/provider для `productCreated`, `productUpdated`, `productDeleted`.
   - Добавить batch handling, если events service dispatch-ит batch handlers для этих events.
   - Добавить handlers для tag/option/feature/category lifecycle events после того, как catalog начнет emit-ить их как production domain events.
   - Handler запускает `listing.facetReferenceSync`, не `catalog.facetReferenceSync`.

4. Перенести listing index sync orchestration:
   - Listing handlers должны запускать listing index sync/delete workflows на основе catalog events.
   - Удалить или поэтапно заменить direct `ListingSyncPublisher` calls из catalog.
   - Catalog не должен вызывать `listing.syncSellableItem`, `listing.syncSellableItems` или `listing.deleteSellableItem` из mutation/workflow paths после завершения переноса.

5. Обновить workflow collection step:
   - Использовать refs из event payload, если они есть.
   - Для `productCreated` вызывать `catalog.productSnapshot` или `catalog.productSnapshots`, если event не содержит enough assignment refs.
   - Для `productUpdated` использовать partial payload refs и только точечно догружать через catalog read API, если payload содержит ids без handles.
   - Для `productDeleted` предпочитать `facetReferenceRefs` из event payload, потому что snapshot после delete может быть недоступен.
   - Full fallback reconciliation использует only listing-owned persisted `listing.facet_source`/`listing.facet_value` refs plus `catalog.productAttributeRefsExist`.

6. Обновить reconciliation step:
   - `findAffectedSources`, `findAffectedSourceValues`, `findDisplayParents`, `refreshSourceStatus`, `refreshValueStatus` читают/пишут только listing DB.
   - Проверку текущего существования source/value handles выполнять через `catalog.productAttributeRefsExist`.
   - Не переносить direct catalog joins из старого `FacetReferenceRepository`.

7. Обновить event emission:
   - `source: "listing"`.
   - service actor id `listing`.
   - batch key prefix `listing:facet-reference-sync`.
   - workflow ids и operation labels используют listing naming.
   - Event type `facetReferenceStateChanged` можно оставить, потому что это domain fact, а не catalog-specific событие.

8. Удалить facet reference sync из catalog:
   - Удалить `FacetReferenceSyncWorkflow` из catalog workflow exports/module.
   - Удалить calls `catalog.facetReferenceSync`.
   - Product/tag/option/feature changes должны emit-ить events, которые listing consumes.

## Phase 7. Заменить прямые catalog DB dependencies

`FacetReferenceRepository` сейчас напрямую читает catalog product/tag/option/feature tables. Это нельзя оставлять, если facets принадлежат listing.

Целевой подход: listing owns facets, catalog owns product/source universe and exposes generic read/query broker API.

1. Добавить catalog broker actions для universal read/query:
   - `catalog.productSnapshot`
   - `catalog.productSnapshots`
   - `catalog.productAttributeSources`
   - `catalog.productAttributeRefsExist`
   - Эти actions читают catalog-owned tags/options/features/translations.
   - Эти actions не читают и не пишут `catalog.facet*` tables.
   - Connection actions возвращают Relay-compatible payload: `edges`, `pageInfo`, `totalCount`.
   - Actions не должны называться facet-specific, если contract полезен другим services.

2. Listing `listingQuery.facetSourceCandidates`:
   - Читает listing-owned `listing.facet_source`, чтобы собрать занятые source keys.
   - Вызывает `catalog.productAttributeSources` с `storeId`, `locale`, `kinds`, `where`, `orderBy`, pagination args и `exclude`.
   - Catalog применяет `exclude`, `where`, `orderBy` и pagination в одном catalog query.
   - Listing возвращает connection как есть, без post-pagination filtering.

3. Listing `listingQuery.facetValueCandidates`:
   - Если передан `meta.facetId`, listing декодит `Facet`, проверяет `facetType`, читает source handles из `listing.facet_source` и existing source value handles из `listing.facet_value`.
   - Если `meta.facetId` не передан, `meta.sourceHandles` обязательны.
   - Listing вызывает `catalog.productAttributeSources` с `includeValues: true`, source scope, exclusions, `where`, `orderBy` и pagination args.
   - Catalog применяет source scope, exclusions, `where`, `orderBy` и pagination в одном catalog query.
   - Listing возвращает connection как есть, без overfetch loop и без post-pagination filtering.

4. Listing `listing.facetReferenceSync`:
   - Для hydrate affected product refs вызывает `catalog.productSnapshot(s)`, если event не содержит handles.
   - Для current existence вызывает `catalog.productAttributeRefsExist`.
   - Не читает catalog product/tag/option/feature tables напрямую.

5. Обновить listing facet scripts validation:
   - `FacetCreateScript` проверяет selected source candidates через `catalog.productAttributeSources` или dedicated lookup by source keys на том же generic contract.
   - `FacetCreateScript` проверяет selected value candidates через `catalog.productAttributeSources` или `catalog.productAttributeRefsExist`.
   - Insert/update ownership остается только в `listing.facet*`.

Не оставлять `JOIN catalog.product_*`, `JOIN catalog.tag*` или imports catalog models в listing-owned facet repositories, scripts, workflows или views.

## Phase 8. Обновить storefront/listing runtime SQL

1. Заменить все `catalog.facet*` joins в listing SQL:
   - `compileFacetResolutionSql.ts`
   - `compileFacetsQuerySql.ts`
   - `compileFacetCountsQuerySql.ts`
   - any aggregation/resolution helper, который references catalog facets

2. Использовать `listing.facet`, `listing.facet_value`, `listing.facet_translation`, `listing.facet_value_translation`.

3. Убедиться, что `swatchId` references listing-owned `FacetSwatch`.

4. Оставить virtual facets (`price`, `available`) listing-owned computed facets, а не catalog facets.

5. Обновить comments и names, где сказано “catalog facet”, если теперь имеется в виду listing facet.

## Phase 9. Cleanup catalog service

1. Удалить из catalog:
   - `facet.graphql` schema include
   - facet query/mutation methods
   - facet resolver imports/classes
   - facet loaders
   - facet scripts
   - facet ownership repositories
   - facet model exports
   - facet migrations после destructive cleanup
   - `FacetReferenceSyncWorkflow`
   - Не удалять catalog source candidate provider actions, если они читают только catalog-owned tags/options/features и не зависят от `catalog.facet*`.

2. Оставить только production product/tag/option/feature events.

3. Product/option/feature/tag mutations больше не должны вызывать facet scripts или repositories.

4. Product update workflows должны emit-ить достаточно domain events, чтобы listing мог reconciles facets.

5. Catalog candidate provider:
   - Не exposes GraphQL `catalogQuery.facet*`.
   - Exposes generic catalog read/query broker actions для listing и других services.
   - Применяет consumer-provided exclusions до pagination.
   - Не хранит facet state и не пишет facet tables.

## Phase 10. Обновить admin frontend и API operations

1. Перенести admin GraphQL operations с `catalogQuery/catalogMutation` на `listingQuery/listingMutation`.

2. Обновить generated operation types.

3. Обновить inventory UI code, который references facet operations:
   - facet management screens
   - edit attributes modal
   - listing preview facets
   - любые operation documents под e2e query fixtures

4. Обновить text/comments, где facets описаны как catalog-owned.

## Phase 11. Обновить packages и shared contracts

1. Проверить `@shopana/events` payloads:
   - Оставить event type names, если они выражают domain facts, например `facetCreated`.
   - Изменить source/actor service ownership на listing.
   - Добавить listing-specific event subjects только если существующие payloads кодируют catalog ownership.

2. Проверить broker type declarations:
   - Добавить listing facet workflow/action contracts, если broker types перечисляют action names.
   - Добавить catalog `productSnapshot(s)`, `productAttributeSources`, `productAttributeRefsExist` contracts, если broker types перечисляют action names.
   - Удалить catalog facet workflow/action contracts.

3. Проверить global ID entity definitions:
   - Оставить `GlobalIdEntity.Facet`, `GlobalIdEntity.FacetValue`, `GlobalIdEntity.FacetSwatch`.
   - ID compatibility shim не нужен, потому что entity type может остаться стабильным при смене service ownership.

## Phase 12. Codegen и build

1. Запустить project codegen через approved Shopana CLI flow после schema moves.

2. Запустить build, когда нужна новая версия кода.

3. Не запускать tests или `tsc` для verification.

4. Не редактировать changeset files вручную. Если changeset нужен, генерировать только через npm tooling.

## Phase 13. Acceptance criteria

Перенос завершен, когда все пункты выполнены:

- `rg -n "Facet|facet|swatch" services/catalog/src services/catalog/migrations -g '!*.md'` не показывает facet domain ownership hits, кроме unrelated non-domain words, event payload references и catalog generic read/query broker provider code.
- В `catalogQuery` нет `facet*` fields.
- В `catalogMutation` нет `facet*` fields.
- `catalog` module больше не регистрирует `FacetReferenceSyncWorkflow`.
- Ни один listing SQL не references `catalog.facet`, `catalog.facet_value`, `catalog.facet_translation` или `catalog.facet_value_translation`.
- Listing owns `FacetSwatch` в Federation вместо extend catalog ownership.
- Listing repository имеет canonical `facet`, `facetValue`, `facetSwatch`, `facetReference` repositories.
- Listing migrations создают facet tables под schema `listing`; listing candidate views не создаются.
- Catalog migrations drop-ают старые catalog facet tables/views или пересоздают raw source candidate views без dependency на `catalog.facet*`.
- Catalog generic read/query actions применяют consumer-provided exclusions до pagination и возвращают корректный `totalCount`.
- Listing candidate resolvers не фильтруют candidates после pagination.
- Product/tag/option/feature changes все еще emit-ят events, которые listing consumes для facet reference reconciliation.
- `listing.facetReferenceSync` emit-ит `facetReferenceStateChanged` с `source: "listing"`.
- Catalog не вызывает listing index/facet sync напрямую после event-driven migration; listing сам consumes catalog events.
- Listing workflow/repositories/scripts не импортируют catalog repository models и не делают joins к `catalog.product_*`, `catalog.tag*`, `catalog.product_option*`, `catalog.product_feature*`.
- Admin frontend facet operations target listing API namespaces.
- Build проходит через approved build flow.

## Порядок реализации

1. Добавить listing DB models и migrations для facets.
2. Перенести repositories/loaders/scripts в listing и подключить их к listing kernel.
3. Перенести GraphQL schema/resolvers и expose `listingQuery/listingMutation` fields.
4. Перенести reference sync workflow в listing и обновить broker workflow names.
5. Добавить catalog generic read/query broker actions и подключить их из listing candidate resolvers/scripts/workflow.
6. Перевести listing index sync на listing-owned event handlers и убрать direct catalog -> listing sync path.
7. Заменить listing storefront SQL с `catalog.facet*` на `listing.facet*`.
8. Удалить catalog facet API/code/migrations.
9. Обновить admin/e2e operation documents и generated GraphQL artifacts.
10. Запустить codegen и build.
11. Выполнить финальные `rg` ownership checks из acceptance criteria.

## Основные риски

- Candidate API сейчас завязан на catalog product/tag/option/feature tables; при переносе GraphQL в listing его нужно сделать broker orchestration API, где catalog применяет filters/exclusions/pagination.
- Product/listing sync сейчас частично идет direct path из catalog в listing; после event-driven migration нельзя оставить второй параллельный source of truth.
- Product mutations сейчас trigger-ят facet reference sync из catalog code paths; одного переноса workflow registration недостаточно, нужен listing event handler.
- Событий самих по себе недостаточно для correctness: `productCreated` payload сейчас не содержит полный assignment snapshot, а existence checks требуют current catalog source universe. Нужен catalog read/query API.
- Federation ownership `FacetSwatch` должен измениться вместе со schema generation, иначе listing facets продолжат resolve-ить swatches как catalog entities.
- Listing storefront SQL уже зависит от catalog facet tables; один пропущенный SQL reference сохранит скрытый catalog ownership.
- Destructive catalog cleanup может сломать local dev data, если не добавить явный one-shot copy migration перед drop catalog tables.
