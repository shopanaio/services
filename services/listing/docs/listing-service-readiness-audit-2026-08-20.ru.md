# Аудит готовности Listing service

Дата: 2026-08-20  
Статус: **NOT READY**  
Объект аудита: `services/listing`  
Критерий: всё заявленное публичное API и вся заявленная бизнес-логика должны быть завершены и иметь
проверяемое подтверждение.

## 1. Итог

Listing service успешно собирается и содержит развитую реализацию canonical listing index,
storefront listing, facets, PostgreSQL search и recommendation runtime. Однако сервис не проходит
строгий gate готовности «всё заявленное завершено».

Оценка общей функциональной готовности: **60–65%**.

Главные причины статуса `NOT READY`:

1. Admin GraphQL публикует backward pagination для listing, но runtime явно её отклоняет.
2. Заявленный Search operational status/overview API отсутствует.
3. Recommendation API и большая часть recommendation business logic не подтверждены работающими
   end-to-end тестами: 99 объявленных recommendation tests не содержат assertions или API calls.
4. Batch product indexing не запускает recommendation lifecycle/reference-state sync, который
   присутствует в single-item workflow.
5. Публичные документы противоречат друг другу по search engine, ranking и recommendation cursor
   semantics.
6. Финальные concurrency, performance и acceptance gates не закрыты.

Успешный production build подтверждает, что текущий TypeScript и локальные GraphQL schemas могут
быть собраны. Он не доказывает completeness API, корректность распределённых workflows или
выполнение бизнес-инвариантов.

## 2. Область аудита

Проверены следующие области:

- Admin GraphQL schema и resolvers;
- Storefront GraphQL schema и resolvers;
- listing index single и batch write paths;
- storefront page, total, facets и virtual facets;
- facet configuration CRUD, scopes, values, merge/unmerge и swatches;
- PostgreSQL FTS search, normalization, synonyms, boosts и explain;
- collection projection и collection listing;
- recommendation policies, manual recommendations, calculation, snapshots, scheduling и serving;
- Catalog/Orders event handlers и DBOS workflows;
- migrations и repository wiring;
- существующие e2e и unit test artifacts;
- архитектурные документы и implementation plans.

Не выполнялись:

- tests;
- отдельный `tsc`;
- dev/start server;
- browser/Playwright;
- database migrations или destructive clean-DB checks.

Эти действия запрещены проектным `AGENTS.md` для текущей сессии. Выполнен только разрешённый build
через Shopana CLI.

## 3. Источники требований

В качестве заявленного контракта использовались:

- `services/listing/src/api/graphql-admin/schema/*.graphql`;
- `services/listing/src/api/graphql-storefront/schema/*.graphql`;
- `knowledge/vault/listing/facets-architecture.ru.md`;
- `knowledge/vault/architecture/product-recommendations.ru.md`;
- `services/listing/docs/search-listing-service-implementation-plan.ru.md`;
- `services/listing/docs/storefront-product-recommendations-api.ru.md`;
- `services/listing/docs/storefront-product-recommendations-implementation-plan.ru.md`;
- `services/listing/docs/listing-universal-variant-terms-index-implementation-tracker.ru.md`;
- `docs/listing-service-architecture.md`.

Документы не образуют единый непротиворечивый контракт. Это самостоятельный readiness blocker:
невозможно доказать «реализовано всё заявленное», пока разные документы заявляют несовместимые
архитектуры и API semantics.

## 4. Методика оценки

Для каждого блока проверялось:

1. Есть ли публичное объявление в GraphQL или архитектурном contract.
2. Есть ли resolver/application path, а не только type/schema.
3. Есть ли repository и persistence implementation.
4. Включён ли handler/workflow/provider в Nest module.
5. Соблюдаются ли tenant, versioning, idempotency и cursor invariants.
6. Есть ли исполняемое подтверждение основной и failure semantics.
7. Нет ли явных unsupported/stub/placeholder paths.

Статусы матрицы:

- `IMPLEMENTED` — кодовый путь присутствует и согласован с заявленным contract;
- `PARTIAL` — основной путь есть, но contract, lifecycle, edge cases или acceptance не завершены;
- `MISSING` — заявленная возможность отсутствует;
- `UNVERIFIED` — implementation присутствует, но доказательная база недостаточна;
- `CONFLICT` — разные публичные источники задают несовместимую semantics.

## 5. Сводная оценка

| Область                           | Оценка | Статус                 | Основной вывод                                                                            |
| --------------------------------- | -----: | ---------------------- | ----------------------------------------------------------------------------------------- |
| Listing index и product lifecycle |    80% | PARTIAL                | Single path развит; batch recommendation lifecycle потерян                                |
| Storefront listing                |    85% | IMPLEMENTED/UNVERIFIED | Page, total, filters, sorts и facets реализованы; runtime acceptance не запускался        |
| Admin listing                     |    70% | PARTIAL                | Forward listing работает; advertised backward pagination отклоняется                      |
| Facet administration              |    85% | IMPLEMENTED/UNVERIFIED | CRUD, scopes, values и swatches присутствуют; часть edge cases слабо проверена            |
| Search runtime                    |    75% | PARTIAL                | PostgreSQL FTS, typo, synonyms, boosts и explain реализованы; status/overview отсутствует |
| Collections                       |    75% | UNVERIFIED             | Projection и listing paths присутствуют; full lifecycle evidence недостаточно             |
| Recommendations                   |    45% | PARTIAL/UNVERIFIED     | Большой runtime реализован, но e2e suite фактически пуст и batch lifecycle неполон        |
| Operational readiness             |    40% | PARTIAL                | Build успешен; performance/concurrency/status gates не закрыты                            |
| Документация                      |    35% | CONFLICT               | PostgreSQL contract конфликтует с Typesense/ONNX документом                               |

## 6. Findings

### F-01. Admin listing рекламирует backward pagination, но runtime её отклоняет

Severity: **P0 — API contract violation**  
Статус: **MISSING**

Admin schema объявляет:

```graphql
listing(
  first: Int
  after: String
  last: Int
  before: String
  # ...
): ListingConnection!
```

Источник:

- `services/listing/src/api/graphql-admin/schema/base.graphql:52`.

При этом input normalization содержит явный runtime отказ:

```typescript
if (args.last != null || args.before != null) {
  throw new ListingResolverInputError(
    "Backward listing pagination is not supported yet",
    args.last != null ? ["last"] : ["before"],
  );
}
```

Источник:

- `services/listing/src/resolvers/admin/listingInput.ts:277`.

Влияние:

- часть опубликованного GraphQL API гарантированно не работает;
- schema/codegen создают ложное ожидание Relay-compatible backward pagination;
- клиенты узнают об отсутствии возможности только во время исполнения.

Необходимое решение:

- реализовать корректные `last`/`before`, boundary predicates, reverse collection и `pageInfo`; либо
- удалить `last`/`before` из публичной schema и всех связанных generated/client contracts.

При строгом критерии пользователя предпочтительно завершить implementation, а не сокращать API без
отдельного продуктового решения.

### F-02. Search status и overview заявлены, но отсутствуют

Severity: **P0 — declared API/business capability missing**  
Статус: **MISSING**

Search implementation plan требует:

- Admin GraphQL для управления, Preview и status;
- status service;
- extension/normalization health;
- фактический indexing backlog/failure state;
- periodic reconciliation diagnostics;
- Overview composition.

Источники:

- `services/listing/docs/search-listing-service-implementation-plan.ru.md:25`;
- `services/listing/docs/search-listing-service-implementation-plan.ru.md:1313`;
- Definition of Done в том же документе, начиная с `:1393`.

Фактический `ListingSearchQuery` публикует только:

- settings;
- synonym group(s);
- product boost(s);
- explain.

Источник:

- `services/listing/src/api/graphql-admin/schema/search.graphql:1`.

В `services/listing/src` отсутствует search status/overview application service и GraphQL resolver.
HTTP `/health` с ответом `status: ok` не заменяет заявленный operational search status: он не
проверяет extensions, profile revision coverage, item freshness, DBOS backlog или failure state.

Влияние:

- merchant/admin не может определить, готов ли search index;
- несовместимость normalization profile или PostgreSQL extensions может проявиться только ошибкой
  runtime query;
- отсутствует заявленный operational contract для rollout и диагностики.

### F-03. Recommendation e2e suite состоит из пустых тестов

Severity: **P0 — acceptance evidence absent**  
Статус: **UNVERIFIED**

В каталогах:

- `e2e/tests/recommendations-admin-api/`;
- `e2e/tests/recommendations-storefront-api/`

объявлено 99 `test(...)`, но найдено:

- `0` assertions через `expect(...)`;
- `0` recommendation GraphQL operation files в `e2e/queries`;
- тестовые функции содержат только комментарии.

Пример:

```typescript
test("returns related products in published display order", () => {
  // Verify Product.relatedProducts resolves product and public source fields.
});
```

Источник:

- `e2e/tests/recommendations-storefront-api/product-recommendations.spec.ts:1`.

Следовательно, текущая suite не проверяет:

- policy CRUD и CAS conflicts;
- manual recommendation validation и scheduling;
- tenant isolation и authorization;
- revision-aware order facts;
- FBT calculation и reversals;
- snapshot build/activation/failure recovery;
- deterministic ranking strategies;
- stale generation handling;
- storefront eligibility;
- Relay pagination и cursor validation;
- federation Product references;
- preview draft overlay;
- maintenance scheduling и idempotency.

Такие tests формально проходят, даже если весь recommendation resolver/runtime удалить. Они являются
списком будущих сценариев, а не verification artifact.

Необходимое решение:

1. Создать реальные Admin и Storefront GraphQL operations.
2. Реализовать fixtures для products, policies, snapshots, orders и time boundaries.
3. Заменить каждый placeholder test исполняемым сценарием либо удалить ложный test declaration и
   вести сценарий как checklist до реализации.
4. Выполнить тесты по одному spec через разрешённый Shopana CLI workflow, когда правила проекта это
   позволят.

### F-04. Batch product index workflow не выполняет recommendation lifecycle sync

Severity: **P1 — latent business lifecycle defect**  
Статус: **PARTIAL**

Single-item listing workflow после atomic index write запускает:

```typescript
await this.stepStartRecommendationReferenceStateSync(write.recommendationPlan);
```

Источник:

- `services/listing/src/workflows/listingIndexWorkflows.ts:377`.

`ListingWriteIndexActionScript` для single path читает old/new publication, availability и category
state и возвращает `RecommendationLifecyclePlan`.

Batch writer возвращает только:

- per-item listing results;
- `appliedProductIds`.

Batch workflow затем запускает только facet reference sync и не строит/не запускает recommendation
reference-state workflow.

Источники:

- `services/listing/src/workflows/ListingBatchProductIndexWorkflow.ts:178`;
- `services/listing/src/workflows/ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts:94`.

Event dispatcher для deferred delivery выбирает batch handler вместо соответствующего single action.
Поэтому при использовании deferred/batched Catalog product events single recommendation lifecycle
path не компенсирует этот пробел.

Источник:

- `services/events/src/workflows/EventDispatchWorkflow.ts:116`.

Возможные последствия:

- manual references не меняют `VALID/STALE` status после product lifecycle transition;
- publication/availability/category changes не создают нужные targeted rebuild requests;
- Storefront может обслуживать устаревший recommendation snapshot до следующего глобального trigger;
- single и batch product processing имеют разную бизнес-семантику.

Необходимое решение:

- batch transaction должна детерминированно построить bounded lifecycle plan для каждого реально
  applied item;
- durable step после commit должен fan-out recommendation reference sync с теми же idempotency и
  partition semantics, что single path;
- single/batch parity должна быть подтверждена одним targeted lifecycle e2e scenario.

### F-05. Recommendation cursor semantics противоречит публичным описаниям

Severity: **P1 — contract ambiguity**  
Статус: **CONFLICT**

Storefront schema и API documentation описывают cursor как привязанный к immutable snapshot
generation, чтобы pagination не смешивала два порядка.

Фактический repository:

1. всегда выбирает текущий `ACTIVE` snapshot;
2. сравнивает его ID с cursor snapshot ID;
3. возвращает `Recommendation snapshot changed between pages`, если активировалась новая generation.

Источник:

- `services/listing/src/repositories/storefront/StorefrontRecommendationQueryRepository.ts:76`;
- `services/listing/src/repositories/storefront/StorefrontRecommendationQueryRepository.ts:136`.

При этом в разных документах встречаются два ожидания:

- continuation закрепляется за старой immutable generation;
- cursor старой generation после activation получает explicit validation error.

Оба варианта могут быть корректным продуктовым решением, но одновременно они не являются одним
контрактом.

Необходимое решение:

- выбрать canonical semantics;
- синхронизировать GraphQL descriptions, API doc, architecture note, implementation plan и e2e;
- явно документировать error code и client recovery, если выбран fail-on-generation-change;
- либо разрешить чтение retained superseded snapshot в пределах cursor safety window.

### F-06. Архитектурный документ обещает отсутствующие Typesense и ONNX

Severity: **P1 — declared architecture conflict**  
Статус: **CONFLICT**

`docs/listing-service-architecture.md` заявляет:

- Typesense;
- BM25 scores;
- ONNX Runtime;
- LightGBM LambdaRank reranking;
- model warm-up, rollback и fallback.

Источник:

- `docs/listing-service-architecture.md:1`.

Фактический current contract и implementation используют:

- PostgreSQL FTS;
- `pg_catalog.simple`;
- `ts_rank_cd`, который явно не называется BM25;
- `pg_trgm` и Levenshtein для typo fallback;
- Node.js normalization через `Intl.Segmenter` и `natural`.

Источник:

- `services/listing/docs/search-listing-service-implementation-plan.ru.md:25`.

`services/listing/package.json` не содержит Typesense или ONNX runtime dependencies, а
`services/listing/src` не содержит соответствующего engine/runtime.

Необходимое решение:

- пометить старый документ superseded и дать ссылку на canonical PostgreSQL contract; либо
- вернуть Typesense/ONNX в утверждённый roadmap и не заявлять current readiness до реализации.

До решения этого конфликта вопрос «всё заявленное реализовано» не имеет однозначного набора
acceptance criteria.

### F-07. Финальные universal variant-term verification gates не закрыты

Severity: **P1 — release acceptance incomplete**  
Статус: **UNVERIFIED**

Implementation tracker содержит незакрытые пункты:

- clean sync fixtures и invariant audit;
- snapshot concurrency spec;
- targeted Playwright execution artifacts;
- 10k performance acceptance;
- availability comparison thresholds;
- temp spill, deadlock и lost-update checks;
- final gate G9;
- `AC-25` performance thresholds.

Источник:

- `services/listing/docs/listing-universal-variant-terms-index-implementation-tracker.ru.md:733`.

При этом tracker одновременно отмечает некоторые implementation assertions как выполненные, хотя
соответствующие verification gates остаются `[ ]`. Это позволяет считать code cutover завершённым,
но не позволяет считать capability полностью принятой.

### F-08. IMAGE swatch end-to-end path не подтверждён

Severity: **P2 — verification gap**  
Статус: **UNVERIFIED**

Admin GraphQL публикует `SwatchType.IMAGE` и `fileId`. Repository/resolver path присутствует, но
единственный полный e2e сценарий с реальным file reference помечен `test.skip`, потому что file
fixture не реализована.

Источник:

- `e2e/tests/facet-admin-api/facet-swatch.spec.ts:513`.

Дополнительно некоторые swatch validation tests допускают как success, так и failure в одном тесте.
Такой assertion не фиксирует бизнес-правило и не обнаруживает его случайное изменение.

Необходимое решение:

- реализовать deterministic media/file fixture;
- включить IMAGE create/read/update/delete scenario;
- зафиксировать обязательные invariants для COLOR, GRADIENT и IMAGE вместо permissive branch в
  тесте.

### F-09. Snapshot consistency является weak-consistency contract и должна быть принята явно

Severity: **P2 — product/architecture decision**  
Статус: **CONFLICT/PARTIAL**

Текущий storefront listing выполняет page, total, facet counts и virtual facets отдельными
`READ COMMITTED` statements. Документация признаёт, что concurrent indexing может дать разные
committed states между response branches.

Источник:

- `knowledge/vault/listing/facets-architecture.ru.md:176`;
- `services/listing/docs/search-listing-service-implementation-plan.ru.md:613`.

При этом universal variant-term tracker содержит более сильные исторические acceptance statements о
едином repeatable snapshot. Audit document позднее фиксирует per-statement `READ COMMITTED` как
фактический contract.

Это не обязательно implementation bug, если weak consistency утверждена как продуктовая semantics.
Но для статуса «business logic завершена» необходимо:

- удалить противоречивые repeatable-read acceptance statements;
- явно описать допустимые page/total/facet расхождения во время concurrent indexing;
- определить, требуется ли client retry/version token;
- подтвердить решение concurrency scenario.

## 7. API readiness matrix

### 7.1. Storefront listing

| API                        | Implementation                              | Verification                                  | Итог                   |
| -------------------------- | ------------------------------------------- | --------------------------------------------- | ---------------------- |
| `Query.products`           | Есть                                        | Listing e2e artifacts существуют              | IMPLEMENTED/UNVERIFIED |
| `Query.searchProducts`     | Есть                                        | Search lifecycle/preview artifacts существуют | IMPLEMENTED/UNVERIFIED |
| `Category.products`        | Есть                                        | Category/listing scenarios существуют         | IMPLEMENTED/UNVERIFIED |
| `Collection.products`      | Есть                                        | Collection pagination artifacts ограничены    | UNVERIFIED             |
| Forward pagination         | Есть                                        | Основные listing scenarios присутствуют       | IMPLEMENTED/UNVERIFIED |
| Filters                    | Facet/vendor/price/availability             | Основная matrix присутствует                  | IMPLEMENTED/UNVERIFIED |
| Same-variant semantics     | Universal variant-term compiler             | Tracker acceptance не закрыт полностью        | PARTIAL                |
| Sorts                      | Manual/relevance/newest/created/title/price | Основная matrix существует                    | IMPLEMENTED/UNVERIFIED |
| Total count                | Есть                                        | Не запускался в текущем аудите                | UNVERIFIED             |
| Facet counts/isolation     | Есть                                        | Extensive listing artifacts существуют        | IMPLEMENTED/UNVERIFIED |
| Availability virtual facet | Есть                                        | Tracker verification incomplete               | PARTIAL                |

### 7.2. Admin listing и facets

| API                        | Implementation           | Итог                   |
| -------------------------- | ------------------------ | ---------------------- |
| `listing(first, after)`    | Есть                     | IMPLEMENTED/UNVERIFIED |
| `listing(last, before)`    | Runtime rejection        | MISSING                |
| Facet queries              | Есть                     | IMPLEMENTED/UNVERIFIED |
| Facet create/update/delete | Есть                     | IMPLEMENTED/UNVERIFIED |
| Facet scopes bulk update   | Есть                     | IMPLEMENTED/UNVERIFIED |
| Facet move/rebalance       | Есть                     | IMPLEMENTED/UNVERIFIED |
| Facet value CRUD           | Есть                     | IMPLEMENTED/UNVERIFIED |
| Merge/unmerge              | Есть                     | IMPLEMENTED/UNVERIFIED |
| Swatch COLOR/GRADIENT      | Есть                     | IMPLEMENTED/UNVERIFIED |
| Swatch IMAGE + file        | Есть в коде, e2e skipped | UNVERIFIED             |

### 7.3. Search

| Capability                        | Implementation     | Итог                         |
| --------------------------------- | ------------------ | ---------------------------- |
| PostgreSQL primary FTS            | Есть               | IMPLEMENTED/UNVERIFIED       |
| Locale normalization              | Есть               | IMPLEMENTED/UNVERIFIED       |
| SKU exact/prefix                  | Есть               | UNVERIFIED                   |
| Phrase/same-element               | Есть               | UNVERIFIED                   |
| Typo fallback                     | Есть               | Preview scenario существует  | IMPLEMENTED/UNVERIFIED |
| Synonym CRUD/CAS                  | Есть               | Частичное e2e/UI evidence    | IMPLEMENTED/UNVERIFIED |
| Product boost CRUD/CAS            | Есть               | Частичное evidence           | IMPLEMENTED/UNVERIFIED |
| Search settings                   | Есть               | Partial evidence             | IMPLEMENTED/UNVERIFIED |
| Explain/Preview                   | Есть               | Targeted scenario существует | IMPLEMENTED/UNVERIFIED |
| Operational status                | Нет                | MISSING                      |
| Overview                          | Нет                | MISSING                      |
| Extension/profile/index readiness | Нет публичного API | MISSING                      |
| Performance acceptance            | Не закрыт          | UNVERIFIED                   |

### 7.4. Recommendations

| Capability                       | Implementation                  | Verification                     | Итог       |
| -------------------------------- | ------------------------------- | -------------------------------- | ---------- |
| Placement policy query/mutations | Есть                            | Placeholder tests                | UNVERIFIED |
| Manual recommendation CRUD       | Есть                            | Placeholder tests                | UNVERIFIED |
| CAS/version conflicts            | Есть в repository/scripts       | Placeholder tests                | UNVERIFIED |
| Draft preview                    | Есть                            | Placeholder tests                | UNVERIFIED |
| Order fact ingestion             | Есть                            | Placeholder tests                | UNVERIFIED |
| Revision/reversal handling       | Есть в workflows                | Placeholder tests                | UNVERIFIED |
| FBT calculation                  | Есть                            | Только limited unit artifacts    | UNVERIFIED |
| Ranking strategies               | Есть                            | Unit artifacts + placeholder e2e | PARTIAL    |
| Snapshot build/activation        | Есть                            | Placeholder e2e                  | UNVERIFIED |
| Scheduling/maintenance           | Есть                            | Placeholder e2e                  | UNVERIFIED |
| Product lifecycle single path    | Есть                            | Нет полноценного e2e             | UNVERIFIED |
| Product lifecycle batch path     | Recommendation sync отсутствует | Нет                              | MISSING    |
| Storefront fields                | Есть                            | Placeholder e2e                  | UNVERIFIED |
| Batched DataLoader read          | Есть                            | Placeholder e2e                  | UNVERIFIED |
| Live publication/availability    | Есть                            | Placeholder e2e                  | UNVERIFIED |
| Cursor generation semantics      | Реализован fail-on-change       | Документы конфликтуют            | CONFLICT   |

## 8. Что реализовано хорошо

Несмотря на итоговый статус, следующие части имеют содержательную implementation:

- tenant-scoped repositories через trusted service context;
- canonical product/variant doc ID allocation;
- event-sequence stale/noop/conflict handling;
- atomic listing index write paths;
- universal variant-term registry и encoding;
- same-variant filtering перед projection в product space;
- price index и matching-variant price sorting;
- declared availability states;
- target facet isolation;
- collection state/projection paths;
- PostgreSQL search normalization/planner/compiler separation;
- search settings, synonyms и boosts как versioned resources;
- DBOS workflow wiring для mutation и indexing paths;
- recommendation persistence model, calculation, snapshot и maintenance components;
- request-scoped DataLoader для recommendation storefront connections;
- consistent store scoping в рассмотренных recommendation queries;
- production build, formatting, lint и type-check.

Эти результаты позволяют завершать сервис инкрементально. Основной риск сейчас не отсутствие кода
вообще, а расхождение между большим объёмом implementation и недостаточным acceptance evidence.

## 9. Build evidence

Выполнено через Shopana CLI:

```text
yarn shopana build -s listing
```

Результат:

- formatting check passed;
- lint passed;
- packages built;
- Listing type check passed;
- `dist/listing.module.js` built;
- schemas и migrations скопированы в dist;
- build completed successfully.

Build не запускал application, PostgreSQL, DBOS workers, event dispatch, GraphQL federation или
Playwright scenarios.

## 10. Рекомендуемый порядок завершения

### Phase 1. Зафиксировать canonical contract

1. Объявить PostgreSQL FTS документ canonical, а Typesense/ONNX документ superseded либо удалить
   его.
2. Принять recommendation cursor semantics.
3. Принять weak или repeatable snapshot semantics для listing response branches.
4. Синхронизировать GraphQL descriptions, knowledge vault, implementation plans и trackers.

Gate:

- один capability имеет одно непротиворечивое описание;
- список обязательного API однозначен.

### Phase 2. Закрыть публичные API gaps

1. Реализовать Admin listing backward pagination.
2. Реализовать Search status и Overview.
3. Добавить extension/profile/index coverage, freshness, backlog и failure diagnostics.
4. Зафиксировать error types и permission model.

Gate:

- ни одно schema field не заканчивается `not supported yet`;
- Search Definition of Done соответствует schema и resolvers.

### Phase 3. Исправить recommendation lifecycle parity

1. Добавить recommendation plans в batch write result.
2. Запускать bounded post-commit reference-state workflows для applied products.
3. Сохранить deterministic idempotency и store/product partitioning.
4. Добавить immediate/deferred single/batch parity scenario.

Gate:

- одинаковый product transition даёт одинаковый Listing и Recommendation state независимо от
  dispatch mode.

### Phase 4. Сделать recommendation e2e suite реальной

Минимальные обязательные specs:

1. policy lifecycle и CAS;
2. manual CRUD/validation/scheduling;
3. authorization и cross-store isolation;
4. order committed/reversed ingestion;
5. deterministic calculation/ranking;
6. snapshot activation и failed rebuild;
7. stale generation handling;
8. storefront related/FBT fields;
9. eligibility changes;
10. cursor pagination semantics;
11. preview draft overlay;
12. maintenance bootstrap/schedule.

Gate:

- tests содержат реальные API calls и assertions;
- нет пустых `test(...)` bodies;
- e2e GraphQL operations проходят codegen;
- каждый spec выполнен отдельно и сохранён verification result.

### Phase 5. Закрыть listing/facet verification

1. Выполнить canonical listing specs.
2. Выполнить clean sync invariant audit.
3. Добавить concurrent transition scenario.
4. Реализовать IMAGE swatch file fixture.
5. Удалить permissive tests, которые принимают и success, и failure.

### Phase 6. Performance и operational acceptance

1. Выполнить 10k listing matrix по зафиксированной процедуре.
2. Зафиксировать p50/p95, WAL, locks, temp spill и index size.
3. Проверить hot posting updates, lost updates и deadlocks.
4. Проверить tenant-scoped GIN plans.
5. Проверить recommendation batch/fan-out limits и scheduler overlap.
6. Закрыть `AC-25` и final tracker gates.

## 11. Definition of Done для статуса READY

Listing service можно перевести в `READY` только когда выполнены все пункты:

- [ ] Все GraphQL fields имеют рабочий resolver/application/repository path.
- [ ] Admin listing поддерживает все объявленные pagination arguments.
- [ ] Search status и Overview опубликованы и вычисляются из реальных runtime sources.
- [ ] Search engine/ranking documentation не содержит Typesense/ONNX claims, если они не являются
      частью implementation.
- [ ] Single и batch indexing имеют полную Listing/Facet/Recommendation lifecycle parity.
- [ ] Все recommendation placeholder tests заменены реальными e2e.
- [ ] Recommendation cursor semantics едина во всех источниках.
- [ ] Listing snapshot consistency semantics едина во всех источниках.
- [ ] Facet IMAGE file path проверен end-to-end.
- [ ] Clean DB migrations и clean sync прошли.
- [ ] Listing, search, facets, collections и recommendations имеют positive, validation, conflict,
      stale, retry и tenancy scenarios.
- [ ] Concurrency checks не обнаруживают lost updates, mixed state или deadlocks.
- [ ] Performance thresholds формально определены и пройдены.
- [ ] Operational status позволяет увидеть index readiness, backlog и failures.
- [ ] Build, schema composition и codegen успешны.
- [ ] Все обязательные tracker acceptance criteria закрыты доказательствами.

## 12. Финальное заключение

Текущая версия Listing service является существенной implementation, а не прототипом-заглушкой. Core
listing/facet/search paths близки к feature-complete состоянию. Однако сервис нельзя считать
завершённым по требованию «всё заявленное API и бизнес-логика должны быть готовы».

Readiness блокируют не cosmetic issues, а наблюдаемые contract gaps:

- опубликованное, но отклоняемое API;
- отсутствующий operational Search API;
- неполная single/batch recommendation parity;
- отсутствие реального acceptance suite для рекомендаций;
- незакрытые concurrency/performance gates;
- конфликтующие источники архитектурных требований.

Рекомендуемый release status до устранения findings: **NOT READY**.
